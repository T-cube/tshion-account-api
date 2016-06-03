import _ from 'underscore';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import objectPath from 'object-path';

import db from 'lib/database';

export let randomBytes = Promise.promisify(crypto.randomBytes);

export function generateToken(length = 48) {
  return randomBytes(length)
  .then(buffer => buffer.toString('hex'));
}

export let hashPassword = Promise.promisify(bcrypt.hash);

export let comparePassword = Promise.promisify(bcrypt.compare);

export let fsStat = Promise.promisify(fs.stat);

export let fsAccess = Promise.promisify(fs.access);

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
  return /^[a-z0-9]+([._\\-]*[a-z0-9])*@([a-z0-9]+[-a-z0-9]*[a-z0-9]+.){1,63}[a-z0-9]+$/.test(email);
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

export function fetchCompanyMemberInfo(companyMembers, data) {
  let args = [].slice.call(arguments);
  args.shift();
  args.shift();
  companyMembers = companyMembers.map(member => _.pick(member, '_id', 'name'));
  return mapObjectIdToData(data, 'user', ['name', 'avatar'], args, companyMembers);
}

export function fetchUserInfo(data) {
  let args = [].slice.call(arguments);
  args.shift();
  return mapObjectIdToData(data, 'user', ['name', 'avatar'], args);
}

export function mapObjectIdToData(data, collection, fields, keys, mergeList) {
  let keyList = [];
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
  _.isString(keys) && (keys = keys.split(',')).map(key => key.trim());
  keys = keys && keys.length ? keys : [''];
  _.forEach(keys, pos => {
    let id = _mapObjectIdToData(data, [], pos);
    keyList = keyList.concat(id);
  });
  keyList = keyList.filter(item => ObjectId.isValid(item));
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
