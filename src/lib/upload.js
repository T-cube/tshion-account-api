import multer from 'multer';
import uuid from 'uuid';
import _ from 'underscore';
import path from 'path';
import mkdirp from 'mkdirp-bluebird';
import config from 'config';
import { dirExists } from 'lib/utils';

let basePath = config.get('upload.path');
if (!/^\//.test(basePath)) {
  basePath = BASE_PATH + basePath;
}
if (!/\/$/.test(basePath)) {
  basePath += '/';
}

const baseUrl = config.get('upload.url');

const DEFAULT_TYPE = 'files';

let types = config.get('upload.types');
if (!_.contains(types, DEFAULT_TYPE)) {
  types.push(DEFAULT_TYPE);
}

function checkTypes(type) {
  return _.contains(types, type);
}

export default function upload(options) {
  options = _.defaults({}, options, {
    type: DEFAULT_TYPE,
  });
  if (!checkTypes(options.type)) {
    throw new Error('invalid upload type');
  }
  let storage = multer.diskStorage({
    destination: (req, file, callback) => {
      let dir = path.normalize(basePath + options.type);
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
      file.url = baseUrl + options.type + '/' + name;
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
