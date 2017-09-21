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
    console.log('str is',str);
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
    console.log(template, options.templates);
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





  sndSMSTask(){

  }

}
