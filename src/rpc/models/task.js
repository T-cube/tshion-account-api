import config from 'config';
import db from 'lib/database';

export default class Task{
  constructor(){
    this.db = db;
    this.config = config;
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
    return db.task.insert(param);
  }

  findTask(param){
    return db.task.find(param,{
      _id:1,
      phone:1,
      content:1
    });
  }


}