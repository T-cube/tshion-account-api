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

const route = RpcRoute.router();
export default route;

const accountModel = new AccountModel();
const taskModel = new TaskModel();
//给任务表添加索引,根据用户名，创建时间来创造索引
taskModel.createIndex();

// 启动程序默认开启任务
taskModel.startQueue();


//筛选用户
route.on('/user/list',(query)=>{
  let criteria = {};
  let {keyword,lastlogin,creator,page,pagesize} = query;
  page = parseInt(page);
  pagesize = parseInt(pagesize);
  if (keyword) {
    keyword = keyword.replace(/\"|\"/g,"");
    let reg = new RegExp(keyword,'i');
    criteria = {
      mobile:{
        $exists:true,
        $ne:null
      },
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
  if (lastlogin) {
    let time = moment().subtract(lastlogin,'month').toDate();
    let loginTime = {'last_login.time':{$lt:time}};
    Object.assign(criteria,loginTime);
  }
  if(!creator){
    return accountModel.page({criteria,page,pagesize});
  }else{
    if(creator == 1){
      return db.company.distinct('owner').then(lists => {
        let totalRows = lists.length;
        if(lists && totalRows && (page*pagesize <= totalRows)){
          lists = lists.slice(page*pagesize,pagesize*(page+1));
          return Promise.all(lists.map(elem => {
            return new Promise(function(resolve,reject){
              taskModel.findOneUser(elem,resolve);
            });
          })).then(list=>{
            return {
              list,
              page,
              pagesize,
              totalRows
            };
          });
        }else{
          return {
            list:[],
            page:page,
            pagesize:pagesize,
            totalRows:totalRows
          };
        }
      });
    }else if(creator == 2){
      let params = {'current':{$exists:true},'current.type':'paid'};
      return Promise.all([
        db.plan.company.count(params),
        db.plan.company.find(params,{_id:1}).skip(page*pagesize).limit(pagesize).then(result=>{
          if(result && result.length){
            return Promise.all(result.map(elem => {
              return new Promise((resolve,reject)=>{
                db.company.findOne({_id:elem._id},{owner:1}).then(owner => {
                  taskModel.findOneUser(owner.owner,resolve);
                });
              });
            })).then(list=>{
              return list;
            });
          }else{
            return [];
          }
        })
      ]).then(([totalRows,list])=>{
        return {
          list,
          page,
          pagesize,
          totalRows
        };
      });
    }
  }
});

//创建任务
route.on('/create',(query) => {
  validate('task_create',query);
  let userId = query.userId;
  let name = query.name;
  let sendAll = query.sendAll;
  let target = query.target;
  let content = query.content;
  let templateId = query.templateId;
  let createTime = new Date();
  if(!sendAll){
    Promise.all(target.map(elem => {
      let targetId = elem.targetId;
      let phone = elem.phone;
      let params = {
        userId:userId,
        content:content,
        name:name,
        createTime:createTime,
        status:0,
        templateId:templateId,
        phone:phone,
        targetId:targetId};
      return new Promise((resolve,reject)=>{
        taskModel.createTask(params).then(data=>{
          resolve();
        }).catch(err=>{
          reject(err);
        });
      });
    })).then(()=>{
      return taskModel.findTask({status:0,createTime:createTime,userId:userId}).then(results=>{
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
    let userCount = db.user.find({mobile:{$exists:true,$ne:null}}).count();
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
              content:content,
              name:name,
              createTime:createTime,
              status:0,
              templateId:templateId,
              phone : elem.mobile,
              targetId:elem._id
            };
          });
          return db.task.insertMany(target,{_id:1,phone:1,content:1,templateId:1}).then((result)=>{
            return taskModel.findTask({status:0,createTime:createTime,userId:userId}).then((results) => {
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

//提交模版审核
route.on('/model/check',(query)=>{
  return app.model('sms').checkModel(query).then((data)=>{
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
  console.log('query',query);
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


