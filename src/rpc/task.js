import RpcRoute from 'models/rpc-route';
import { strToReg } from 'lib/utils';
import path from 'path';
// import EventEmitter from 'events';
import db from 'lib/database';
import _ from 'underscore';
import { ObjectId,DBRef } from 'mongodb';
import moment from 'moment-timezone';
import { validate } from './schema/task';
import { ApiError } from 'lib/error';


import AccountModel from './models/account';
import TaskModel from './models/task';
import app from 'index';
import config from 'config';

const emailConfig = config.sendTask.email;

const route = RpcRoute.router();
export default route;

const accountModel = new AccountModel();
const taskModel = new TaskModel();
//给任务表添加索引,根据用户名，创建时间来创造索引
taskModel.createIndex();

// 启动程序默认开启任务
taskModel.startQueue();
taskModel.startEmailQueue();


//筛选用户
route.on('/user/list',(query)=>{
  let criteria = {
    mobile:{
      $exists:true,
      $ne:null
    }
  };
  let {keyword,lastlogin,creator,page,pagesize} = query;
  page = parseInt(page);
  pagesize = parseInt(pagesize);
  creator = parseInt(creator);
  if (keyword) {
    keyword = keyword.replace(/\"|\"/g,"");
    let reg = new RegExp(keyword,'i');
    criteria = {
      $or : [
        {
          name: {
            $regex: reg
          }
        },
        {
          mobile: {
            $regex: reg
          }
        }
      ]
    };
  }
  let lookup =
  {$lookup:{
    from:'company',
    localField:'_id',
    foreignField:'owner',
    as:'ownerCompany'
  }};
  let returnField = {
    $project:{
      name: 1,
      mobile: 1,
      mobile_verified: 1,
      description: 1,
      avatar: 1,
      birthdate: 1,
      sex: 1,
      last_login:1
    }
  };
  if (lastlogin) {
    // let time = moment().subtract(lastlogin,'month').toDate();
    let time = new Date(lastlogin);
    let loginTime = {'last_login.time':{$lt:time}};
    Object.assign(criteria,loginTime);
  }
  if(creator == 0){
    return accountModel.page({criteria,page,pagesize});
  }else if(creator == 1){
    return Promise.all([
      db.user.aggregate([
        {
          $match:criteria
        },
        lookup,
        {
          $match:{'ownerCompany':{$ne:[]}}
        },
        {
          $count:'ownerCompantCount'
        }
      ]).then((totalRows)=>{
        return totalRows[0].ownerCompantCount;
      }),
      db.user.aggregate([
        {
          $match:criteria
        },
        lookup,
        {
          $match:{'ownerCompany':{$ne:[]}}
        },
        returnField,
        {
          $skip:pagesize*page
        },{
          $limit:pagesize
        }
      ]).then((list)=>{
        return list;
      })
    ]).then(([totalRows,list])=>{
      return {
        list,
        page,
        pagesize,
        totalRows
      };
    }).catch((err)=>{
      throw new ApiError(500,err);
    }).catch(()=>{
      return {
        list:[],
        page:page,
        pagesize:pagesize,
        totalRows:0
      };
    });
  }else if(creator == 2){
    return Promise.all([
      db.user.aggregate([
        {
          $match:criteria
        },
        {$lookup:{
          from:'company',
          localField:'_id',
          foreignField:'owner',
          as:'ownerCompany'
        }},
        {
          $match:{'ownerCompany':{$ne:[]}}
        },{
          $unwind:'$ownerCompany',
        },{
          $lookup:{
            from:'plan.company',
            localField:'ownerCompany._id',
            foreignField:'_id',
            as:'ownerPayCompany'
          }
        },{
          $match:{'ownerPayCompany':{$ne:[]}}
        },{
          $unwind:'$ownerPayCompany'
        },{
          $match:{
            'ownerPayCompany.current.type':'paid'
          }
        },
        {
          $count:'ownerPayComCount'
        }
      ]).then((companyCount)=>{
        return companyCount[0].ownerPayComCount;
      }),
      db.user.aggregate([
        {
          $match:criteria
        },
        {$lookup:{
          from:'company',
          localField:'_id',
          foreignField:'owner',
          as:'ownerCompany'
        }},
        {
          $match:{'ownerCompany':{$ne:[]}}
        },{
          $unwind:'$ownerCompany',
        },{
          $lookup:{
            from:'plan.company',
            localField:'ownerCompany._id',
            foreignField:'_id',
            as:'ownerPayCompany'
          }
        },{
          $match:{'ownerPayCompany':{$ne:[]}}
        },{
          $unwind:'$ownerPayCompany'
        },{
          $match:{
            'ownerPayCompany.current.type':'paid'
          }
        },
        returnField,
        {
          $skip:pagesize*page
        },{
          $limit:pagesize
        }
      ]).then((list)=>{
        return list;
      })
    ]).then(([totalRows,list])=>{
      return {
        totalRows,
        list,
        page,
        pagesize
      };
    }).catch((err)=>{
      throw ApiError(500,err);
    }).catch((err)=>{
      return {
        totalRows:0,
        list:[],
        page:page,
        pagesize:pagesize
      };
    });

  }

});

//创建任务
route.on('/create',(query) => {
  validate('task_create',query);
  let userId = query.userId;
  let username = query.username;
  let name = query.name;
  let sendAll = query.sendAll;
  let target = query.target;
  let content = query.content;
  let templateId = query.templateId;
  let templateName = query.templateName;
  let createTime = new Date();
  if(!sendAll){
    let params = target.map(elem=>{
      let targetId = elem.targetId;
      let phone = elem.phone;
      return elem = {
        userId:userId,
        username:username,
        content:content,
        name:name,
        createTime:createTime,
        status:0,
        templateId:templateId,
        phone:phone,
        targetId:targetId,
        templateName:templateName,
        type:'sms'
      };
    });
    db.queue.task.insertMany(params).then(()=>{
      return taskModel.findTask({status:0,createTime:createTime,userId:userId,type:'sms'}).then(results=>{
        results = results.map(result=>{
          return JSON.stringify(result);
        });
        // 加入队列
        return taskModel.addList(results).then(function(count){
          return;
        }).catch(err=>{
          return;
        });
      });
    });
  }else{
    db.user.count({mobile:{$exists:true,$ne:null}}).then(userCount=>{
       // 节流，防止内存泄露,并且insertMany方法最多一次能插入1000条数据
      const pageSize = 1000;
      let page = 0;
      const pageCount = Math.floor(userCount/1000);
      let Recursive = function(){
        if(page>pageCount){
          return;
        }
        createTime = new Date();
        db.user.find({mobile:{$exists:true,$ne:null}},{_id:1,mobile:1}).skip(page*pageSize).limit(pageSize).then((data)=>{
          if(data && data.length){
            target = data.map(elem => {
              return elem = {
                userId:userId,
                username:username,
                content:content,
                name:name,
                createTime:createTime,
                status:0,
                templateId:templateId,
                templateName:templateName,
                phone : elem.mobile,
                targetId:elem._id,
                type:'sms'
              };
            });
            return db.queue.task.insertMany(target).then((result)=>{
              return taskModel.findTask({status:0,createTime:createTime,userId:userId,type:'sms'}).then((results) => {
                results = results.map(result=>{
                  return JSON.stringify(result);
                });
                // 加入队列
                return taskModel.addList(results).then(function(count){
                  page = page + 1;
                  return Recursive();
                }).catch(err=>{
                  throw new ApiError(500,err);
                });
              });
            });
          }else{
            return;
          }
        });
      };
      Recursive();
    });
  }
});

//查询多个短信模版
route.on('/model/list',(query)=>{
  return app.model('sms').findModel(query).then((data)=>{
    return data;
  }).catch((err)=>{
    throw new Error(err);
  });
});

//查询单个短信模版
route.on('/model/detail',(query)=>{
  return app.model('sms').findOneModel(query).then((data)=>{
    return data;
  }).catch((err)=>{
    throw new Error(err);
  });
});

// 创建短信模版
route.on('/model/create',(query)=>{
  return app.model('sms').createModel(query).then((data)=>{
    return data;
  }).catch((err)=>{
    throw new Error(err);
  });
});

// 更新短信模版
route.on('/model/update',(query)=>{
  return app.model('sms').updateModel(query).then((data)=>{
    return data;
  }).catch((err)=>{
    throw new Error(err);
  });
});

//提交模版审核
route.on('/model/check',(query)=>{
  return app.model('sms').checkModel(query).then((data)=>{
    return data;
  }).catch((err)=>{
    throw new Error(err);
  });
});

//删除短信模版
route.on('/model/delete',(query)=>{
  return app.model('sms').deleteModel(query).then((data)=>{
    return data;
  }).catch((err)=>{
    throw new Error(err);
  });
});

//查询多个签名
route.on('/sign/list',()=>{
  return app.model('sms').signList().then((data)=>{
    return data;
  }).catch((err)=>{
    throw new Error(err);
  });
});

// 查询单个签名
route.on('/sign/detail',(query)=>{
  return app.model('sms').signDetail(query).then((data)=>{
    return data;
  }).catch((err)=>{
    throw new Error(err);
  });
});

// 添加签名
route.on('/sign/add',(query)=>{
  return app.model('sms').addSign(query).then((data)=>{
    return data;
  }).catch((err)=>{
    throw new Error(err);
  });
});

// 更新签名
route.on('/sign/update',(query)=>{
  return app.model('sms').updateSign(query).then((data)=>{
    return data;
  }).catch((err)=>{
    throw new Error(err);
  });
});

// 查询任务(短信任务)
route.on('/list',(query)=>{
  let {keyword,status,createTime,page,pagesize,type} = query;
  let params = {type:type};
  if(keyword){
    let text = keyword.replace(/\"|\"|\'|\'/g,"");
    let reg = new RegExp(text,'i');
    Object.assign(params,{
      $or : [
        {
          name: {
            $regex: reg
          }
        },
        {
          phone: {
            $regex: reg
          }
        }
      ]
    });
  }
  if(status){
    Object.assign(params,{
      status:Number(status)
    });
  }
  if(createTime){
    let begin = new Date(createTime);
    let after = moment(begin).add(1,'day').toDate();
    Object.assign(params,{
      $and:[
        {createTime:{$gte:begin}},
        {createTime:{$lte:after}}
      ]
    });
  }
  return taskModel.findTask(params,{
    _id:1,
    phone:1,
    name:1,
    content:1,
    status:1,
    message:1,
    createTime:1,
    templateId:1,
    templateName:1,
    type:1,
    username:1,
    smsIds:1
  },{page:Number(page),pagesize:Number(pagesize)}).then((result)=>{
    return result;
  }).catch((err)=>{
    throw new ApiError(500,err);
  }).catch((err)=>{
    return {
      count:0,
      tasks:[],
      page:page,
      pagesize:pagesize
    };
  });
});

// 重发失败短信任务
route.on('/resend',(query)=>{
  validate('task_resend',query);
  let {sendId,sendAll,type} = query;
  let params = {
    status:-1,
    type:type
  };
  if(!sendAll){
    sendId = sendId.map((id)=>{
      return ObjectId(id);
    });
    Object.assign(params,{_id:{$in:sendId}});
  }
  return taskModel.findTask(params).then((result)=>{
    if(!result || !result.length){
      return true;
    }
    result = result.map(result=>{
      return JSON.stringify(result);
    });
    return taskModel.addList(result).then((count)=>{
      return true;
    }).catch((err)=>{
      throw new Error(err);
    });
  });
});

// 重发失败邮件任务
route.on('/email/resend',(query)=>{
  validate('task_resend',query);
  let {sendId,sendAll,type} = query;
  let params = {
    status:-1,
    type:type
  };
  if(!sendAll){
    sendId = sendId.map((id)=>{
      return ObjectId(id);
    });
    Object.assign(params,{_id:{$in:sendId}});
  }
  return taskModel.findTask(params,{
    _id:1,
    email:1,
    targetName:1,
    content:1,
    templateInvokeName:1
  }).then((result)=>{
    if(!result || !result.length){
      return {success:false};
    }
    return taskModel.addEmailList(result).then((count)=>{
      return {success:true};
    }).catch((err)=>{
      throw new Error(err);
    });
  });
});

// 投递回应
route.on('/sms/sendStatus',(query)=>{
  let {page,pagesize,startDate,endDate,smsIds} = query;
  startDate = moment(startDate).format('YYYY-MM-DD');
  endDate = moment(endDate).format('YYYY-MM-DD');
  let params = {
    start:page*pagesize,
    limit:pagesize,
    startDate:startDate,
    endDate:endDate
  };
  if(smsIds){
    Object.assign(params,{smsIds:smsIds});
  }
  return app.model('sms').sendStatus(params).then(data=>{
    return data;
  }).catch(err=>{
    throw new Error(err);
  });
});

// 邮件群发
//查询邮件模版
route.on('/mail/model/list',(query)=>{
  let {page,pagesize,templateStat} = query;
  page = +page;
  pagesize =+pagesize;
  let params = {
    page,
    pagesize
  };
  if(typeof templateStat === 'number'){
    templateStat = +templateStat;
    Object.assign(params,{templateStat:templateStat});
  }
  return app.model('email').getTemplateList(params).then((data)=>{
    return data;
  }).catch((err)=>{
    throw new Error(err);
  });
});

// 查询单个邮件模版
route.on('/mail/model/detail',(query)=>{
  let {invokeName} = query;
  return app.model('email').getDetailModel({invokeName:invokeName}).then((data)=>{
    return data;
  }).catch((err)=>{
    throw new Error(err);
  });
});

// 批量查询
route.on('/mail/domain/list',()=>{
  return app.model('email').getDomainList().then((data)=>{
    return data;
  }).catch((err)=>{
    throw new Error(err);
  });
});

// 添加邮件模版
route.on('/mail/model/add',(query)=>{
  validate('task_model_add',query);
  return app.model('email').addModel(query).then((data)=>{
    return data;
  }).catch((err)=>{
    throw new Error(err);
  });
});

// 更新邮件模版
route.on('/mail/model/update',(query)=>{
  return app.model('email').updateModel(query).then((data)=>{
    return data;
  }).catch((err)=>{
    throw new Error(err);
  });
});

// 删除邮件模版
route.on('/mail/model/delete',(query)=>{
  return app.model('email').deleteModel(query).then((data)=>{
    return data;
  }).catch((err)=>{
    throw new Error(err);
  });
});

// 查询邮箱用户列表
route.on('/mail/user/list',(query)=>{
  let criteria = {
    email:{
      $exists:true,
      $nin:[null,'']
    }
  };
  let {lastlogin,page,pagesize,keyword} = query;
  if(lastlogin){
    let time = new Date(lastlogin);
    let loginTime = {'last_login.time':{$lt:time}};
    Object.assign(criteria,loginTime);
  }
  if(keyword){
    let text = keyword.replace(/\"|\"|\'|\'/g,"");
    let reg = new RegExp(text,'i');
    Object.assign(criteria,{
      $or : [
        {
          name: {
            $regex: reg
          }
        },
        {
          email: {
            $regex: reg
          }
        }
      ]
    });
  }
  return accountModel.page({criteria,page,pagesize});
});

// 创建邮件群发任务
route.on('/mail/task/create',(query)=>{
  validate('email_task_create',query);
  let {target,sendAll,userId,username,type,content,templateInvokeName,status,name} = query;
  if(templateInvokeName !== emailConfig.defaultModel){
    throw new ApiError(400,'传输的模版调用名称不能用在群发任务中');
  }
  let createTime = new Date();
  let params = {
    userId,
    username,
    type,
    content,
    createTime,
    templateInvokeName,
    status,
    name
  };
  if(!sendAll){
    target = target.map(function(value){
      Object.assign(value,params);
      return value;
    });
    db.queue.task.insertMany(target).then(()=>{
      return taskModel.findTask({
        type:type,
        createTime:createTime,
        name:name},{
          _id:1,
          email:1,
          targetName:1,
          content:1,
          templateInvokeName:1
        }).then((data)=>{
          if(data.length){
            return taskModel.addEmailList(data).then(count=>{
              return;
            }).catch((err)=>{
              throw new ApiError(500,err);
            });
          }else{
            return;
          }
        });
    }).catch((err)=>{
      throw new ApiError(500,err);
    });
  }else{
    db.user.count({email:{$exists:true,$nin:[null,'']}}).then(userCount=>{
      let page = 0;
      let pagesize = 1000;
      let count = Math.floor(userCount/pagesize);
      //截流
      let Recursive = function(){
        if(page>count){
          return;
        }
        return db.user.find({email:{$exists:true,$nin:[null,'']}},{_id:1,email:1,name:1}).skip(page*pagesize).limit(pagesize).then(result=>{
          if(result&&result.length){
            let results = result.map((value)=>{
              value = {
                targetId:value._id,
                email:value.email,
                targetName:value.name
              };
              return Object.assign(value,params);
            });
            return db.queue.task.insertMany(results).then(()=>{
              return taskModel.findTask({
                type:type,
                createTime:createTime,
                name:name},{
                  _id:1,
                  email:1,
                  targetName:1,
                  content:1,
                  templateInvokeName:1
                }).then((data)=>{
                  if(data.length){
                    return taskModel.addEmailList(data).then(count=>{
                      page = page+1;
                      Recursive();
                    }).catch((err)=>{
                      throw new ApiError(500,err);
                    });
                  }else{
                    return;
                  }
                });
            }).catch((err)=>{
              throw new ApiError(500,err);
            });
          }else{
            return;
          }
        }).catch(err=>{
          throw new ApiError(500,err);
        });
      };
      Recursive();
    });
  }
});

// 查询邮件群发任务列表
route.on('/mail/task/list',(query)=>{
  let {page,pagesize,keyword,createTime,status} = query;
  let params = {type:'email'};
  if(status){
    Object.assign(params,{status:parseInt(status)});
  }
  if(keyword){
    let reg = new RegExp(keyword,'i');
    Object.assign(params,{
      $or : [
        {
          name: {
            $regex: reg
          }
        },
        {
          email: {
            $regex: reg
          }
        }
      ]
    });
  }
  if(createTime){
    let begin = new Date(createTime);
    let after = moment(begin).add(1,'day').toDate();
    Object.assign(params,{
      $and:[
        {createTime:{$gte:begin}},
        {createTime:{$lte:after}}
      ]
    });
  }
  return taskModel.findTask(params,{
    _id:1,
    email:1,
    targetName:1,
    username:1,
    createTime:1,
    templateInvokeName:1,
    status:1,
    name:1,
    message:1,
    from:1,
    type:1,
    emailIds:1
  },{page,pagesize}).then((data)=>{
    return data;
  }).catch((err)=>{
    return {
      count:0,
      tasks:[],
      page:page,
      pagesize:pagesize
    };
  });
});


// 取消订阅列表
route.on('/mail/unsub/list',(query)=>{
  let {page,pagesize,email,startDate,endDate} = query;
  let params = {
    start:page*pagesize,
    limit:pagesize
  };
  if(email){
    Object.assign(params,{email:email});
  }
  if(startDate&&endDate){
    startDate = moment(startDate).format('YYYY-MM-DD');
    endDate = moment(endDate).format('YYYY-MM-DD');
    Object.assign(params,{startDate:startDate,endDate:endDate});
  }
  return app.model('email').unsubList(params).then((data)=>{
    return data;
  });
});

// 删除订阅列表
route.on('/mail/unsub/delete',(query)=>{
  let {email} = query;
  return app.model('email').delUnSub({email:email}).then((data)=>{
    return data;
  }).catch((err)=>{
    throw new ApiError(500,err);
  });
});

// 添加取消订阅地址
route.on('/mail/unsub/add',(query)=>{
  let {email} = query;
  return app.model('email').addUnSub({email:email}).then((data)=>{
    return data;
  }).catch((err)=>{
    throw new ApiError(500,err);
  });
});

// 投递回应
route.on('/mail/sendStatus',(query)=>{
  let {page,pagesize,emailIds,startDate,endDate} = query;
  startDate = moment(startDate).format('YYYY-MM-DD');
  endDate = moment(endDate).format('YYYY-MM-DD');
  let params = {
    start:page * pagesize,
    limit:parseInt(pagesize),
    startDate:startDate,
    endDate:endDate
  };
  if(emailIds){
    Object.assign(params,{emailIds:emailIds});
  }
  return app.model('email').sendRespond(params).then(data=>{
    return data;
  }).catch((err)=>{
    throw new ApiError(500,err);
  });
});

