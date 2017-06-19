import _ from 'underscore';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import http from 'http';
import uuid from 'uuid';
import objectPath from 'object-path';
import { camelCase } from 'change-case';
import escapeRegexp from 'escape-regexp';
import { ApiError } from 'lib/error';

import db from 'lib/database';
import config from 'config';

export let randomBytes = Promise.promisify(crypto.randomBytes);

export function camelCaseObjectKey(obj) {
  let _obj = {};
  _.each(obj, (val, key) => {
    _obj[camelCase(key)] = val;
  });
  return _obj;
}

export function generateToken(length = 48) {
  return randomBytes(length)
  .then(buffer => buffer.toString('hex'));
}

export function hashPassword(password) {
  const rounds = config.get('security.passwordHashRounds');
  const genSalt = Promise.promisify(bcrypt.genSalt);
  const hash = Promise.promisify(bcrypt.hash);
  return genSalt(rounds)
  .then(salt => {
    return hash(password, salt);
  });
}

export const comparePassword = Promise.promisify(bcrypt.compare);

let fsStat = Promise.promisify(fs.stat);

let fsAccess = Promise.promisify(fs.access);

export function fileExists(path) {
  return fsAccess(path, fs.F_OK)
  .then(() => fsStat(path))
  .then(stat => stat.isFile())
  .catch(() => false);
}

export function dirExists(path) {
  return fsAccess(path, fs.F_OK)
  .then(() => fsStat(path))
  .then(stat => stat.isDirectory())
  .catch(() => false);
}

export function getUniqName(list, name) {
  if (_.contains(list, name)) {
    let match = /^(.+)\((\d+)\)$/.exec(name);
    if (match) {
      let baseName = match[1];
      let index = parseInt(match[2]) + 1;
      let newName = `${baseName}(${index})`;
      return getUniqName(list, newName);
    } else {
      return getUniqName(list, `${name}(2)`);
    }
  } else {
    list.push(name);
    return name;
  }
}

export function getUniqFileName(list, name) {
  let extname = path.extname(name);
  let basename = path.basename(name, extname);
  let names = [];
  list.forEach(filename => {
    let _extname = path.extname(filename);
    if (_extname == extname) {
      let _basename = path.basename(filename, _extname);
      names.push(_basename);
    }
  });
  let newName = getUniqName(names, basename);
  return newName + extname;
}

export function getEmailName(email) {
  let pattern = /^([\w\.]+?)@.+$/;
  let result = pattern.exec(email);
  if (!result) {
    return email;
  } else {
    return result[1];
  }
}

export function maskEmail(email) {
  let result = /^([\w\.]+)(@.+)$/.exec(email);
  if (!result) {
    return '***';
  }
  let str = result[1];
  let len = str.length > 2 ? 2 : str.length - 1;
  return str.substr(0, len) + '****' + result[2];
}

export function maskMobile(mobile) {
  let result = /^(\d{3})\d{4}(\d{4})$/.exec(mobile);
  if (!result) {
    return '***';
  }
  return result[1] + '****' + result[2];
}

export function timestamp(t) {
  if (t) {
    return +new Date(t);
  } else {
    return +new Date();
  }
}

export function time(t) {
  if (t) {
    return new Date(t);
  } else {
    return new Date();
  }
}

export function expire(ms) {
  return time(timestamp() + ms);
}

export function isEmail(str) {
  return /^[a-z0-9-_\.]+@([a-z0-9\-]+\.)+[a-z]+$/.test(str);
}

export function isMobile(str) {
  return /^1[3|4|5|7|8]\d{9}$/.test(str);
}

export function uniqObjectIdArray(list) {
  const newList = list.filter((value, index, array) => {
    return _.findIndex(array, v => v.equals(value)) == index;
  });
  return newList;
}

export function intersectObjectIdArray(list, otherList) {
  list = uniqObjectIdArray(list);
  otherList = uniqObjectIdArray(otherList);
  let newList = [];
  list.forEach(item => {
    if (_.find(otherList, _item => _item.equals(item))) {
      newList.push(item);
    }
  });
  return newList;
}

export function findObjectIdIndex(list, id) {
  return _.findIndex(list, item => item.equals(id));
}

export function fetchCompanyMemberInfo(company, data, ...args) {
  let companyMembers = company.members.map(m => _.pick(m, '_id', 'name'));
  let keys = getKeysFromArgs(args);
  let keyList = getListOfKeys(data, keys);
  let companyMemberIds = companyMembers.map(m => m._id);
  keyList = intersectObjectIdArray(keyList, companyMemberIds);
  if (!keyList.length) {
    return mapObjectIdToData(data, 'user', ['name', 'avatar'], keys, companyMembers);
  }
  return db.company.member.old.find({
    company: company._id,
    user: {
      $in: keyList
    }
  }, {
    user: 1,
    name: 1
  })
  .then(companyMembersOld => {
    companyMembersOld = companyMembersOld.filter(i => i).map(member => ({
      _id: member.user,
      name: member.name,
      old_member: true,
    }));
    return mapObjectIdToData(data, 'user', ['name', 'avatar'], keys, companyMembers.concat(companyMembersOld));
  });
}

export function fetchUserInfo(data, ...args) {
  return mapObjectIdToData(data, 'user', ['name', 'avatar'], args);
}

export function mapObjectIdToData(data, collection, fields, keys, mergeList) {
  if (!data) {
    return data;
  }
  let isDataObjectId = ObjectId.isValid(data);
  if ((_.isArray(data) && data.length == 0) || !data) {
    return Promise.resolve([]);
  }
  if (_.isArray(collection)) {
    let mapList = collection;
    mergeList = fields;
    return Promise.all(mapList.map(item => mapObjectIdToData(data, ...item, mergeList)))
    .then(() => data);
  }
  fields = fields || [];
  _.isString(fields) && (fields = fields.split(',')).map(field => field.trim());
  keys = getKeysFromArgs(keys);
  let keyList = getListOfKeys(data, keys);
  if (!keyList.length) {
    return Promise.resolve(isDataObjectId ? null : data);
  }
  return objectPath.get(db, collection).find({
    _id: {
      $in: uniqObjectIdArray(keyList)
    }
  }, _.object(fields, _.range(fields.length).map(() => 1)))
  .then(infoList => {
    _.forEach(keys, pos => {
      _mapObjectIdToData(data, [], pos, infoList, mergeList);
    });
    return isDataObjectId ? infoList[0] : data;
  });
}

function _mapObjectIdToData(data, k, pos, infoList, mergeList) {
  k = k || [];
  pos = pos.replace(/^\.+/, '');
  let posList = pos.split('.');
  if (pos && !(!k.length && _.isArray(data))) {
    k.push(posList.shift());
  }
  let newPos = posList.join('.');
  let val = objectPath.get(data, k);
  if (newPos || _.isArray(val)) {
    if (_.isArray(val)) {
      let tempLsit = [];
      for (var i in val) {
        tempLsit = tempLsit.concat(_mapObjectIdToData(data, k.concat(i), newPos, infoList, mergeList));
      }
      return tempLsit;
    } else {
      return _mapObjectIdToData(data, k, newPos, infoList, mergeList);
    }
  }
  if (!ObjectId.isValid(val)) {
    return [];
  }
  val = ObjectId(val);
  if (undefined === infoList) {
    return [val];
  } else {
    let foundVal = _.find(infoList, info => info._id.equals(val));
    let mergeVal = _.find(mergeList, info => info._id.equals(val));
    objectPath.set(data, k, _.extend(foundVal, mergeVal));
  }
}

function getListOfKeys(data, keys) {
  let keyList = [];
  _.forEach(keys, pos => {
    let id = _mapObjectIdToData(data, [], pos);
    keyList = keyList.concat(id);
  });
  keyList = keyList.filter(item => ObjectId.isValid(item));
  return keyList;
}

function getKeysFromArgs(args) {
  let keys = args;
  _.isString(keys) && (keys = keys.split(',')).map(key => key.trim());
  keys = keys && keys.length ? keys : [''];
  return keys;
}

export function getGpsDistance(from, to) {
  const TO_RAD = Math.PI / 180;
  let distance = Math.round(
    Math.acos(
      Math.sin(
        from.latitude * TO_RAD
      ) *
      Math.sin(
        to.latitude * TO_RAD
      ) +
      Math.cos(
        from.latitude * TO_RAD
      ) *
      Math.cos(
        to.latitude * TO_RAD
      ) *
      Math.cos(
        to.longitude * TO_RAD - from.longitude * TO_RAD
      )
    ) * 6378137
  );
  return distance;
}

export function getClientIp(req) {
  return req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.ip ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress;
}

export function strToReg(source, ext) {
  if (!ext || !_.isString(ext)) {
    ext = undefined;
  }
  return new RegExp(escapeRegexp(source), ext);
}

export function formatAmount(amount) {
  return Math.round(amount) / 100;
}

export function incId(tb) {
  return db.ids.findAndModify({
    update: {
      $inc: {id: 1}
    },
    query: {
      name: tb
    },
    new: true,
    upsert:true,
  })
  .then(doc => doc.value && doc.value.id);
}

export function cleanHtmlTags(content) {
  if (!content || !_.isString(content)) {
    return '';
  }
  return content
    .replace(/<(\w+)?\/?[^>]*>/g, ' ')
    .replace(/\s\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/^\s+/, '');
}

export function textEllipsis(str, len = 50) {
  len *= 2;
  if (str.length * 2 <= len) {
    return str;
  }
  let strlen = 0;
  let s = '';
  for (let i = 0; i < str.length; i++) {
    s = s + str.charAt(i);
    if (str.charCodeAt(i) > 128) {
      strlen = strlen + 2;
      if(strlen >= len){
        return s.substring(0, s.length - 1) + '...';
      }
    } else {
      strlen = strlen + 1;
      if(strlen >= len){
        return s.substring(0, s.length - 2) + '...';
      }
    }
  }
  return s;
}

export function getPageInfo(query) {
  let { page, pagesize } = query;
  page = page > 0 ? parseInt(page) : 1;
  pagesize = (pagesize <= config.get('view.maxListNum') && pagesize > 0
    ? parseInt(pagesize)
    : parseInt(config.get('view.listNum')));
  return {page, pagesize};
}

export function validateIdCardNo(code) {
  let areas = {
    11: '北京',
    12: '天津',
    13: '河北',
    14: '山西',
    15: '内蒙古',
    21: '辽宁',
    22: '吉林',
    23: '黑龙江',
    31: '上海',
    32: '江苏',
    33: '浙江',
    34: '安徽',
    35: '福建',
    36: '江西',
    37: '山东',
    41: '河南',
    42: '湖北',
    43: '湖南',
    44: '广东',
    45: '广西',
    46: '海南',
    50: '重庆',
    51: '四川',
    52: '贵州',
    53: '云南',
    54: '西藏',
    61: '陕西',
    62: '甘肃',
    63: '青海',
    64: '宁夏',
    65: '新疆',
    71: '台湾',
    81: '香港',
    82: '澳门',
    91: '国外'
  };
  let message = '';
  let pass = true;
  let area = null;

  if (!code || !/^\d{6}(18|19|20)?\d{2}(0[1-9]|1[12])(0[1-9]|[12]\d|3[01])\d{3}(\d|X)$/i.test(code)) {
    message = '身份证号格式错误';
    pass = false;
  } else if(!areas[code.substr(0, 2)]) {
    message = '地址编码错误';
    pass = false;
  } else {
    // 18位身份证需要验证最后一位校验位
    if(code.length == 18){
      code = code.split('');
      // ∑(ai×Wi)(mod 11)
      // 加权因子
      const factor = [ 7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2 ];
      //校验位
      const parity = [ 1, 0, 'X', 9, 8, 7, 6, 5, 4, 3, 2 ];
      let sum = 0;
      for (let i = 0; i < 17; i++) {
        let ai = code[i];
        let wi = factor[i];
        sum += ai * wi;
      }
      let last = parity[sum % 11];
      if(last != code[17]) {
        message = '校验位错误';
        pass = false;
      }
    }
  }
  return pass;
}

export function downloadFile(url, folder) {

  let filename = uuid.v4() + path.extname(url);
  let key = 'upload/' + folder + '/' + filename;
  let filepath = config.get('upload.path') + key;

  return new Promise((resolve, reject) => {

    http.get(url, (res) => {
      let bufferList = [];
      res.on('data', (chunk) => {
        bufferList.push(new Buffer(chunk));
      });
      res.on('end', () => {
        let data = Buffer.concat(bufferList);
        fs.writeFile(filepath, data, function(err) {
          if (err) {
            return reject(err);
          }
          resolve({key, path: filepath});
        });
      });
    });
  });

}

export function saveCdnInBucket(bucketInstance, files) {

  if (!_.isArray(files)) {
    const { key, path } = files;
    return cdnUpload(key, path);
  }

  return Promise.map(files, file => {
    const { key, path } = file;
    return cdnUpload(key, path);
  });

  function cdnUpload(key, path) {
    return bucketInstance.upload(key, path).then(data => {
      return {
        key,
        path,
        url: `${data.server_url}${key}`
      };
    });
  }
}

export function validadeSocialCreditCode(code) {
  let patrn = /^[0-9A-Z]+$/;
  if ((code.length != 18) || !patrn.test(code)) {
    return false;
  } else {
    let ancode, ancodeValue, total = 0;
    let weightedfactors = [1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28];
    let str = '0123456789ABCDEFGHJKLMNPQRTUWXY';
    for (let i = 0; i < code.length - 1; i++) {
      ancode = code.substring(i, i + 1);
      ancodeValue = str.indexOf(ancode);
      total = total + ancodeValue * weightedfactors[i];
    }
    let logiccheckcode = 31 - total % 31;
    if (logiccheckcode === 31) logiccheckcode = 0;
    let initStr = '0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,J,K,L,M,N,P,Q,R,T,U,W,X,Y';
    let arrayStr = initStr.split(',');
    logiccheckcode = arrayStr[logiccheckcode];
    let checkcode = code.substring(17, 18);
    if (logiccheckcode !== checkcode) return false;
    return true;
  }
}

export function validadeBusCode(busCode) {
  let ret = false;
  if (busCode.length == 15) {
    let s = [];
    let p = [];
    let a = [];
    let m = 10;
    p[0] = m;
    for (let i = 0; i < busCode.length; i++) {
      a[i] = parseInt(busCode.substring(i, i + 1), m);
      s[i] = (p[i] % (m + 1)) + a[i];
      if (0 == s[i] % m) {
        p[i + 1] = 10 * 2;
      } else {
        p[i + 1] = (s[i] % m) * 2;
      }
    }
    if (1 == (s[14] % m)) {
      ret = true;
    } else {
      ret = false;
    }
  }
  else if ('' == busCode) {
    ret = false;
  } else {
    ret = false;
  }
  return ret;
}
