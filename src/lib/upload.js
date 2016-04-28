import multer from 'multer';
import uuid from 'uuid';
import _ from 'underscore';
import path from 'path';
import mkdirp from 'mkdirp-bluebird';
import config from 'config';
import { dirExists } from 'lib/utils';

function getUploadPath(dir) {
  let basePath = config.get('upload.path');
  if (!/^\//.test(basePath)) {
    basePath = BASE_PATH + basePath;
  }
  if (!/\/$/.test(basePath)) {
    basePath += '/';
  }
  return path.normalize(basePath + dir);
}

function getUploadUrl(type, filename) {
  return config.get('upload.url') + type + '/' + filename;
}

function checkTypes(type) {
  return _.contains(config.get('upload.types'), type);
}

export default function upload(options) {
  options = _.defaults({}, options, {
    type: config.get('upload.defaultType'),
  });
  if (!checkTypes(options.type)) {
    throw new Error('invalid upload type');
  }
  let storage = multer.diskStorage({
    destination: (req, file, callback) => {
      let dir = getUploadPath(options.type);
      dirExists(dir)
      .then(exists => {
        if (!exists) {
          return mkdirp(dir)
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
      let name = uuid.v4() + path.extname(file.originalname);
      file.url = getUploadUrl(options.type, name);
      callback(null, name);
    }
  });
  return multer({
    storage: storage,
    fileFilter(req, file, cb) {
      let allowed = config.get('upload.allowed')[options.type];
      let ext = path.extname(file.originalname);
      if (_.contains(allowed, ext)) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    }
  });
  // return multer({storage: storage});
}
