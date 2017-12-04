import Promise from 'bluebird';
import multer from 'multer';
import uuid from 'uuid';
import _ from 'underscore';
import path from 'path';
import mkdirp from 'mkdirp-bluebird';
import config from 'config';
import mime from 'mime-types';

import { dirExists } from 'lib/utils';
import { BASE_PATH } from 'lib/constants';

export function getDistributedPath(name) {
  const directoryDepth = config.get('upload.directoryDepth');
  let path = name.split('').slice(0, directoryDepth).join('/') + '/';
  return path;
}

export function getUploadPath(dir) {
  let basePath = config.get('upload.path');
  if (!/^\//.test(basePath)) {
    basePath = BASE_PATH + basePath;
  }
  if (!/\/$/.test(basePath)) {
    basePath += '/';
  }
  return path.normalize(basePath + dir);
}

export function getRelUploadPath(dir, name) {
  return dir + '/' + name;
}

export function getUploadUrl(dir, filename) {
  return config.get('upload.url') + dir + '/' + filename;
}

function checkTypes(type) {
  return _.contains(config.get('upload.types'), type);
}

export function isImageFile(name) {
  if (!_.isString(name)) {
    return false;
  }
  let ext = path.extname(name).replace('.', '').toLowerCase();
  return _.contains('jpeg,jpg,gif,png'.split(','), ext);
}

export function randomAvatar(type) {
  const sizes = config.get('avatar.count');
  const size = sizes[type];
  console.log(size);
  let index = _.random(1, size).toString();
  let num = ('0'+index).slice(-2);
  let filename = `${num}.png`;
  let dir = `system/avatar/${type}`;
  return getUploadUrl(dir, filename);
}

export function defaultAvatar(type) {
  let filename = '00.png';
  let dir = `system/avatar/${type}`;
  return getUploadUrl(dir, filename);
}

export function upload(options) {
  options = _.defaults({}, options, {
    type: config.get('upload.defaultType'),
  });
  if (!checkTypes(options.type)) {
    throw new Error('invalid upload type');
  }
  const storage = multer.diskStorage({
    destination: (req, file, callback) => {
      file.ext = path.extname(file.originalname);
      file.mimetype = mime.lookup(file.ext) || 'application/octet-stream';
      file.uuidName = uuid.v4() + file.ext;
      let classPath = getDistributedPath(file.uuidName);
      let dir = getUploadPath('upload/' + options.type);
      dir = dir + '/' + classPath;
      file.url = getUploadUrl('upload/' + options.type, file.uuidName);
      file.cdn_key = getRelUploadPath('upload/' + options.type, file.uuidName);
      file.relpath = getRelUploadPath('upload/' + options.type, classPath + file.uuidName);
      dirExists(dir)
      .then(exists => {
        if (!exists) {
          return mkdirp(dir);
        }
      })
      .then(() => {
        callback(null, dir);
      })
      .catch(err => {
        console.error(err);
        throw err;
      });
    },
    filename: (req, file, callback) => {
      callback(null, file.uuidName);
    }
  });
  return multer({
    storage: storage,
    fileFilter(req, file, cb) {
      const allowed = config.get('upload.allowed')[options.type];
      const ext = path.extname(file.originalname);
      if (_.contains(allowed, ext.toLowerCase())) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    }
  });

  // return multer({storage: storage});
}

export function saveCdn(bucket) {
  return (req, res, next) => {
    const qiniu = req.model('qiniu').bucket(bucket);
    let promise;

    function cdnUpload(file) {
      return qiniu.upload(file.cdn_key, file.path).then(data => {
        file.cdn_bucket = bucket;
        file.url = data.url;
      });
    }

    if (req.file) {
      promise = cdnUpload(req.file);
    } else if (req.files) {
      promise = Promise.map(req.files, file => {
        return cdnUpload(file);
      });
    } else {
      promise = Promise.resolve();
    }
    promise.then(() => next())
    .catch(next);
  };
}

export function cropAvatar(req) {
  let url;
  if (req.file) {
    url = req.file.url;
  } else {
    url = req.body.avatar || req.body.logo;
  }
  const {crop_x: x,crop_y: y, crop_width: width, crop_height: height} = req.body;
  if (x && y && width && height) {
    const crop = { x, y, width, height };
    url = req.model('qiniu').image(url).setCrop(crop).toString();
  }
  return url;
}
