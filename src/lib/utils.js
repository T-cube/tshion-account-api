import _ from 'underscore';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import objectPath from 'object-path';
import { camelCase } from 'change-case';
import escapeRegexp from 'escape-regexp';

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
  const rounds = config.get('passwordHashRounds');
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

export function isEmail(email) {
  return /^[a-z0-9-_\.]+@([a-z0-9\-]+\.)+[a-z]+$/.test(email);
}

export function uniqObjectId(list) {
  let newList = [];
  list.forEach(item => {
    let found = false;
    newList.forEach(newItem => {
      if (!newItem || newItem.equals(item)) {
        found = true;
      }
    });
    found || newList.push(item);
  });
  return newList;
}

export function diffObjectId(list, otherList) {
  uniqObjectId(list);
  uniqObjectId(otherList);
  let newList = [];
  list.forEach(item => {
    let found = false;
    otherList.forEach(newItem => {
      if (newItem.equals(item)) {
        found = true;
      }
    });
    found || newList.push(item);
  });
  return newList;
}

export function indexObjectId(list, id) {
  let index = -1;
  for (let k in list) {
    if (ObjectId.isValid(list[k]) && list[k].equals(id)) {
      index = k;
      break;
    }
  }
  return index;
}

export function fetchCompanyMemberInfo(company, data, ...args) {
  let companyMembers = company.members.map(m => _.pick(m, '_id', 'name'));
  let keys = getKeysFromArgs(args);
  let keyList = getListOfKeys(data, keys);
  let companyMemberIds = companyMembers.map(m => m._id);
  keyList = diffObjectId(keyList, companyMemberIds);
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
      $in: uniqObjectId(keyList)
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

export function getPageInfo(query) {
  let { page, pagesize } = query;
  page = page > 0 ? parseInt(page) : 1;
  pagesize = (pagesize <= config.get('view.maxListNum') && pagesize > 0
    ? parseInt(pagesize)
    : parseInt(config.get('view.listNum')));
  return {page, pagesize};
}
