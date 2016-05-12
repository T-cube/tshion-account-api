import _ from 'underscore';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import fs from 'fs';
import objectPath from 'object-path';

export let randomBytes = Promise.promisify(crypto.randomBytes);

export function generateToken() {
  return randomBytes(48)
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
  .catch(err => false);
}

export function dirExists(path) {
  return fsAccess(path, fs.F_OK)
  .then(() => fsStat(path))
  .then(stat => stat.isDirectory())
  .catch(err => false);
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
    return name;
  }
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

export function timestamp() {
  return +new Date;
}

export function time() {
  return new Date;
}

export function isEmail(email) {
  return /^(\w)+(\.\w+)*@(\w)+((\.\w+)+)$/.test(email);
}

export function uniqObjectId(list) {
  let newList = [];
  list.forEach(item => {
    let found = false;
    newList.forEach(newItem => {
      if (newItem.equals(item)) {
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
    if (list[k].equals(id)) {
      index = k;
      break;
    }
  }
  return index;
}

export function fetchUserInfo(data) {
  let args = [].slice.call(arguments);
  args.shift();
  args = args.length ? args : [''];
  let promiseLine = [];
  _.forEach(args, pos => {
    let promise = _fetchUserInfo(data, [], pos);
    promiseLine = promiseLine.concat(promise);
  });
  return Promise.all(promiseLine);
}

function _fetchUserInfo(data, k, pos) {
  try {
    k = k || [];
    pos = pos.replace(/^\.+/, '');
    let posList = pos.split('.');
    if (pos && !(!k.length && _.isArray(data))) {
      k.push(posList.shift());
    }
    let newPos = posList.join('.');
    let val = objectPath.get(data, k);
    let dataAccess = k.length ? 'data["' + k.join('"]["') + '"]' : 'data';
    if (newPos || _.isArray(val)) {
      if (_.isArray(val)) {
        let tempPromise = [];
        for (var i in val) {
          tempPromise.push(_fetchUserInfo(data, k.concat(i), newPos));
        }
        return tempPromise;
      } else {
        return _fetchUserInfo(data, k, newPos);
      }
    }
    if (!ObjectId.isValid(val)) {
      return null;
    }
    console.log(k);
    return db.user.findOne({
      _id: val
    }, {
      name: 1,
      avatar: 1,
    })
    .then(info => {
      typeof data == 'object' && eval(dataAccess + '=' + JSON.stringify(info));
      return info;
    })
  } catch(e) {
    return Promise.reject(e);
  }
}
