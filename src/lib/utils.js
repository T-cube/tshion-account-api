import _ from 'underscore';
import { ObjectId } from 'mongodb';

export function getUniqName(list, name, index) {
  if (_.contains(list, name)) {
    let match = /^(.+)\((\d+)\)$/.exec(name);
    if (match) {
      let baseName = match[1];
      let index = parseInt(match[2]) + 1;
      let newName = `${baseName}(${index})`;
      console.log(newName);
      return getUniqName(list, newName);
    } else {
      return getUniqName(list, `${name}(2)`);
    }
  } else {
    return name;
  }
}

export function timestamp() {
  return +new Date;
}

export function time() {
  return new Date;
}

// 获取当前登录用户的id
export function userId() {
  return ObjectId('57184b9d492623c40da5fae7');
};

// 获取当前登录用户的id
export function userInfo() {
  return {
    _id: userId(),
    name: '测试帝',
    mobile: '18500001111',
    birthdate: new Date('1990-02-01'),
    birthdate: new Date(),
    email: 'test@tlifang.com',
    address: 'address',
    sex: 'M',
    // avatar: 'https://ss0.bdstatic.com/70cFuHSh_Q1YnxGkpoWK1HF6hhy/it/u=3047710011,1274531363&fm=116&gp=0.jpg',
  }
};

export function isEmail(email) {
  return /\w+@\w+\.\w+/.test(email);
}
