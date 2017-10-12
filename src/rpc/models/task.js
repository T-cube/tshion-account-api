import config from 'config';
import db from 'lib/database';
import { ObjectId,DBRef } from 'mongodb';
import app from 'index';
import { queue } from 'node-redis-queue-lh';
const options = { db:3 };

export default class Task{
  constructor(query){
    this.db = db;
    this.config = config.sendTask.sms;
    this.client = new queue(options);
  }

  findOneUser(id,cb){
    let userResult = db.user.findOne({_id:id},{
      name: 1,
      email: 1,
      email_verified: 1,
      mobile: 1,
      mobile_verified: 1,
      description: 1,
      avatar: 1,
      birthdate: 1,
      sex: 1,
      last_login:1
    });
    cb(userResult);
  }

  createTask(param){
    return this.db.queue.task.insert(param);
  }

  findTask(param,returnData,pageInfo){
    let params = {
      _id:1,
      phone:1,
      content:1,
      templateId:1
    };
    if (returnData){
      params = returnData;
    }
    if(!pageInfo){
      console.log('done this this');
      return this.db.queue.task.find(param,params);
    }else{
      const {page,pagesize} = pageInfo;
      return Promise.all([
        this.db.queue.task.count(param),
        this.db.queue.task.find(param).skip(page*pagesize).limit(pagesize).sort({createTime:-1})
      ]).then(([count,tasks])=>{
        return {
          count,
          tasks,
          page,
          pagesize
        };
      });
    }
  }

  updateTask(param,setParam,cb){
    return this.db.queue.task.update(param,setParam);
  }

  //给任务表添加索引,根据用户名，创建时间来创造索引
  createIndex(){
    this.db.queue.task.count({}).then(result=>{
      if(result === 0){
        return  this.db.queue.task.createIndex({userId:1,createTime:-1,status:1,type:1});
      }else{
        return;
      }
    });
  }

  // 启动任务队列，当队列为空时线程挂起
  startQueue(){
    let list = [this.config.listName];
    let timeout = this.config.timeout;
    this.client.shift(list,timeout).then(task=>{
      if(task && task.length){
        task = JSON.parse(task[1]);
        app.model('sms').sendSMSTask(task).then(data=>{
          console.log('data is',data);
          if(data.statusCode === 200){
            this.updateTask({_id:ObjectId(task._id)},{$set:{status:1,message:data.message}}).then((result)=>{
              this.startQueue();
            });
          }else{
            this.updateTask({_id:ObjectId(task._id)},{$set:{status:-1,message:data.message}}).then((result)=>{
              this.startQueue();
            });
          }
        });
      }
    });
  }

  // 加入任务队列
  addList(values){
    return this.client.add(this.config.listName,values);
  }

}