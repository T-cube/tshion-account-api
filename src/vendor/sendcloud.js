import _ from 'underscore';
import rp from 'request-promise';
import Promise from 'bluebird';
import crypto from 'crypto';

export class SendCloudError extends Error {

  constructor(message) {
    super();
    this.message = message;
  }

}

export class EmailSender {

  constructor(options) {
    this.options = options;
  }

  checkTemplate(template) {
    const { options } = this;
    return new Promise((resolve, reject) => {
      if (!_.has(options.templates, template)) {
        let error = new SendCloudError(`invalid email template: ${template}`);
        reject(error);
      } else {
        resolve();
      }
    });
  }

  send(template, to, data) {
    return this.checkTemplate(template)
    .then(() => {
      let _data = _.extend({}, data, {
        to: to,
      });
      return this.sendToMany(template, [_data]);
    });
  }

  sendToMany(template, data) {
    const { options } = this;
    return this.checkTemplate(template)
    .then(() => {
      let formData = {
        apiUser: options.apiUser,
        apiKey: options.apiKey,
        from: options.from,
        fromName: options.fromName,
        xsmtpapi: this.getApiData(template, data),
        templateInvokeName: template,
      };
      // console.log('sendcloud:', JSON.stringify(formData));
      // return Promise.resolve();
      let params = {
        uri: options.url,
        form: formData,
        json: true,
      };
      console.log(params);
      return rp.post(params);
    });
  }

  getApiData(template, data) {
    const { options } = this;
    const { variables } = options.templates[template];
    let to = [];
    let sub = {};
    _.each(variables, name => {
      sub[`%${name}%`] = [];
    });
    _.each(data, item => {
      to.push(item.to);
      _.each(variables, name => {
        sub[`%${name}%`].push(item[name]);
      });
    });
    return JSON.stringify({
      to: to,
      sub: sub,
    });
  }
// 批量查询邮件模版
  getTemplateList(query){
    let {templateStat,page,pagesize} = query;
    let params = {
      apiUser: this.options.apiUser,
      apiKey: this.options.apiKey,
      start:page*pagesize,
      limit:pagesize
    };
    if(typeof templateStat === 'number'){
      Object.assign(params,{templateStat:templateStat});
    }
    console.log('params is ',params);
    let paramList = [];
    for(let key in params){
      paramList.push(key+'='+params[key]);
    }
    let uri = 'http://api.sendcloud.net/apiv2/template/list?'+paramList.join('&');
    return rp.get({
      uri:uri,
      json:true
    });
  }
// 添加短信模版

}

export class SmsSender {

  constructor(options) {
    this.options = options;
  }

  sign(params) {
    const { smsKey } = this.options;
    let keys = _.keys(params).sort();
    let pairs = [];
    _.each(keys, key => {
      pairs.push(key + '=' + params[key]);
    });
    let str = smsKey + '&' + pairs.join('&') + '&' + smsKey;
    let hash = crypto.createHash('md5').update(str).digest('hex');
    return hash;
  }

  encodeVars(data) {
    data = _.mapObject(data, val => {
      return encodeURIComponent(val);
    });
    return JSON.stringify(data);
  }

  send(template, phone, data) {
    const { options } = this;
    let templateData = options.templates[template];
    if (!templateData) {
      throw new SendCloudError(`invalid sms template: ${template}`);
    }
    let params = {
      smsUser: options.smsUser,
      templateId: templateData.id,
      msgType: 0,
      phone: phone,
      vars: this.encodeVars(data),
    };
    let signature = this.sign(params);
    _.extend(params, {
      signature: signature,
    });
    console.log(params);
    // console.log('sendcloud:', JSON.stringify(formData));
    // return Promise.resolve();
    return rp.post({
      uri: options.url,
      form: params,
      json: true,
    })
    .then(data => console.log(data))
    .catch(e => console.error(e));
  }
//查询多个短信模版
  findModel(query){
    const {options} = this;
    const isVerifyStr = query.status;
    let params = {};
    let uri = 'http://www.sendcloud.net/smsapi/list';
    if(typeof isVerifyStr === 'undefined'){
      params = {
        smsUser:options.smsUser
      };
      uri = uri + '?smsUser=' + options.smsUser;
    }else{
      params = {
        isVerifyStr:`${isVerifyStr}`,
        smsUser:options.smsUser
      };
      uri = uri + '?smsUser=' + options.smsUser + '&isVerifyStr=' + isVerifyStr;
    }
    let signature = this.sign(params);
    uri = uri + '&signature=' + signature;
    return new Promise((resolve,reject)=>{
      return rp.get({
        uri:uri,
        json:true
      }).then((data)=>{
        resolve(data);
      }).catch((err)=>{
        reject(err);
      });
    });
  }
//查询单个短信模版
  findOneModel(query){
    const {options} = this;
    const {templateIdStr} = query;
    let params = {
      smsUser:options.smsUser,
      templateIdStr:templateIdStr
    };
    let uri = 'http://www.sendcloud.net/smsapi/get';
    let signature = this.sign(params);
    uri = uri + '?templateIdStr='+templateIdStr+'&smsUser='+params.smsUser+'&signature=' + signature;
    return new Promise((resolve,reject)=>{
      return rp.get({
        uri:uri,
        json:true
      }).then((data)=>{
        resolve(data);
      }).catch((err)=>{
        reject(err);
      });
    });
  }
// 创建短信模版
  createModel(query){
    const {options} = this;
    const {templateName,templateText,signPositionStr,smsTypeStr,signId} = query;

    let params = {
      smsUser:options.smsUser,
      templateName:templateName,
      templateText:templateText,
      signId:signId,
      signPositionStr:signPositionStr,
      smsTypeStr:smsTypeStr
    };

    let uri = 'http://www.sendcloud.net/smsapi/addsms';
    let signature = this.sign(params);
    Object.assign(params,{signature:signature});
    return new Promise((resolve,reject)=>{
      return rp.post({
        uri: uri,
        form: params,
        json: true,
      }).then((data)=>{
        resolve(data);
      }).catch((err)=>{
        reject(err);
      });
    });
  }
//提交模版审核
  checkModel(query){
    const {options} = this;
    const {templateIdStr} = query;

    let params = {
      smsUser:options.smsUser,
      templateIdStr:templateIdStr
    };

    let uri = 'http://www.sendcloud.net/smsapi/submitsms';
    let signature = this.sign(params);
    Object.assign(params,{signature:signature});
    // uri = uri + '?templateIdStr='+templateIdStr+'&smsUser='+params.smsUser+'&signature'+signature;
    return new Promise((resolve,reject)=>{
      return rp.post({
        uri: uri,
        form: params,
        json: true
      }).then((data)=>{
        resolve(data);
      }).catch((err)=>{
        reject(err);
      });
    });
  }
// 更新短信模版
  updateModel(query){
    const {options} = this;
    const {templateIdStr,templateName,templateText,signId,signPositionStr,smsTypeStr} = query;
    let params = {
      smsUser:options.smsUser,
      templateIdStr:templateIdStr,
      templateName:templateName,
      signId:signId,
      signPositionStr:signPositionStr,
      smsTypeStr:smsTypeStr
    };
    if(templateText){
      Object.assign(params,{templateText:templateText});
    }
    let uri = 'http://www.sendcloud.net/smsapi/updatesms';
    let signature = this.sign(params);
    Object.assign(params,{signature:signature});
    return new Promise((resolve,reject)=>{
      return rp.post({
        uri: uri,
        form: params,
        json: true
      }).then((data)=>{
        resolve(data);
      }).catch((err)=>{
        reject(err);
      });
    });
  }

// 删除短信模版
  deleteModel(query){
    const {options} = this;
    const {templateIdStr} = query;
    let params = {
      smsUser:options.smsUser,
      templateIdStr:templateIdStr
    };
    let uri = 'http://www.sendcloud.net/smsapi/deletesms';
    let signature = this.sign(params);
    Object.assign(params,{signature:signature});
    return new Promise((resolve,reject)=>{
      return rp.post({
        uri: uri,
        form: params,
        json: true
      }).then((data)=>{
        resolve(data);
      }).catch((err)=>{
        reject(err);
      });
    });
  }

//查询多个签名
  signList(){
    const {options} = this;
    let params = {
      smsUser:options.smsUser
    };
    let uri = 'http://www.sendcloud.net/smsapi/sign/list';
    let signature = this.sign(params);
    uri = uri + '?smsUser='+options.smsUser+'&signature='+signature;
    return new Promise((resolve,reject)=>{
      return rp.get({
        uri:uri,
        json:true
      }).then((data)=>{
        resolve(data);
      }).catch((err)=>{
        reject(err);
      });
    });
  }

//查询单个签名
  signDetail(query){
    const {options} = this;
    const {id} = query;
    let params = {
      smsUser:options.smsUser,
      id:Number(id)
    };
    let uri = 'http://www.sendcloud.net/smsapi/sign/get';
    let signature = this.sign(params);
    let parmList = [];
    for(let key in params){
      let item = key + '=' + params[key];
      parmList.push(item);
    }
    uri = uri + '?'+parmList.join('&')+'&signature='+signature;
    return new Promise((resolve,reject)=>{
      return rp.get({
        uri:uri,
        json:true
      }).then((data)=>{
        resolve(data);
      }).catch((err)=>{
        reject(err);
      });
    });
  }

// 添加签名， 短信模板必须含有「签名」, 否则不能通过审核. 目前用户只能拥有1个签名.
  addSign(query){
    const {options} = this;
    const {signType,signName} = query;
    let params = {
      smsUser:options.smsUser,
      signType:Number(signType),
      signName:signName
    };
    let uri = 'http://www.sendcloud.net/smsapi/sign/save';
    let signature = this.sign(params);
    let parmList = [];
    for(let key in params){
      let item = key + '=' + params[key];
      parmList.push(item);
    }
    uri = uri + '?'+parmList.join('&')+'&signature='+signature;
    return new Promise((resolve,reject)=>{
      return rp.post({
        uri:uri,
        from:params,
        json:true
      }).then((data)=>{
        resolve(data);
      }).catch((err)=>{
        reject(err);
      });
    });
  }

// 更新签名
  updateSign(query){
    const {options} = this;
    const {id,signType,signName} = query;
    let params = {
      smsUser:options.smsUser,
      id:Number(id),
      signType:Number(signType),
      signName:signName
    };
    let uri = 'http://www.sendcloud.net/smsapi/sign/updatesms';
    let signature = this.sign(params);
    let parmList = [];
    for(let key in params){
      let item = key + '=' + params[key];
      parmList.push(item);
    }
    uri = uri + '?'+parmList.join('&')+'&signature='+signature;
    return new Promise((resolve,reject)=>{
      return rp.get({
        uri:uri,
        json:true
      }).then((data)=>{
        resolve(data);
      }).catch((err)=>{
        reject(err);
      });
    });
  }

// 发送任务
  sendSMSTask(query){
    const {options} = this;
    const {phone,content,templateId} = query;
    // let artical = this.encodeVars({code:content});
    // content = encodeURIComponent();
    let artical = JSON.stringify({code:content});
    let params = {
      smsUser:options.smsUser,
      templateId:templateId,
      phone:phone,
      vars:artical
    };
    let signature = this.sign(params);
    _.extend(params, {
      signature: signature,
    });
    // 测试时撤销注释
    // return new Promise((resolve,reject)=>{
    //   resolve({statusCode:200,message:'发送成功'});
    // });
    return new Promise((resolve,reject)=>{
      return rp.post({
        uri: 'http://www.sendcloud.net/smsapi/send',
        form: params,
        json: true,
      })
      .then((data)=>{resolve(data);})
      .catch((err) => {reject(err);});
    });
  }
}
