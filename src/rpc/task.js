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
  let criteria = {
    mobile:{
      $exists:true,
      $ne:null
    }
  };
  let {keyword,lastlogin,creator,page,pagesize} = query;
  page = parseInt(page);
  pagesize = parseInt(pagesize);
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

// 查询任务(短信任务／邮件任务)
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
        {createTime:{$gt:begin}},
        {createTime:{$lt:begin}}
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
    type:1
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

// 重发失败任务
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