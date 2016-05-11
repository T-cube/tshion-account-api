import _ from 'underscore';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import fs from 'fs';

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

export function getUniqName(list, name, index) {
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
  let promiseLine = [];
  args = args.length ? args : [''];
  _.forEach(args, pos => {
    let promise = findUserPosition(data, [], pos);
    if (_.isArray(promise)) {
      promiseLine = promiseLine.concat(promise);
    } else {
      promiseLine.push(promise);
    }
  });
  return Promise.all(promiseLine);
}

function findUserPosition(data, k, pos) {
  let posList = [];
  k = k || [];
  pos = pos.replace(/^\.+/, '');
  if (pos) {
    posList = pos.split('.');
    k.push(posList.shift());
  }
  let dataAccess = k.length ? 'data["' + k.join('"]["') + '"]' : 'data';
  let val = eval(dataAccess);
  if (pos || _.isArray(val)) {
    let newPos = posList.join('.');
    if (_.isArray(val)) {
      let tempPromise = [];
      for (var i in val) {
        k.push(i);
        tempPromise.push(findUserPosition(data, k, newPos));
      }
      return tempPromise;
    } else {
      return findUserPosition(data, k, newPos);
    }
  }
  return db.user.findOne({
    _id: eval(dataAccess)
  }, {
    name: 1,
    avatar: 1,
  })
  .then(info => {
    eval(dataAccess + '=' + JSON.stringify(info));
  })
}
