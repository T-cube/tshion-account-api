import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import fs from 'fs';

import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import {
  dirSanitization,
  dirValidation,
  fileSanitization,
  fileValidation,
  locationSanitization,
  locationValidation,
} from './schema';
import { oauthCheck, authCheck } from 'lib/middleware';
import upload from 'lib/upload';
import { getUniqName, mapObjectIdToData } from 'lib/utils';
import C from 'lib/constants';
import config from 'config';

let api = require('express').Router();
export default api;

api.use(oauthCheck());

let posKey = null;
let posVal = null;
let uploader = () => () => {};
let max_file_size = 0;
let max_total_size = 0;

api.use((req, res, next) => {
  posKey = req.project_id ? 'project_id' : 'company_id';
  posVal = req.project_id || req.company._id;
  uploader = () => {
    // return req.project_id
    //   ? upload({type: 'attachment'}).single('document')
    //   : upload({type: 'attachment'}).array('document');
    return upload({type: 'attachment'}).array('document');
  };
  if (req.project_id) {
    max_file_size = config.get('upload.document.project.max_file_size');
    max_total_size = config.get('upload.document.project.max_total_size');
  } else {
    max_file_size = config.get('upload.document.company.max_file_size');
    max_total_size = config.get('upload.document.company.max_total_size');
  }
  next();
});

api.get('/dir/:dir_id?', (req, res, next) => {
  let condition = {
    [posKey]: posVal
  };
  let dir_id = null;
  if (req.params.dir_id) {
    condition._id = dir_id = ObjectId(req.params.dir_id);
  } else {
    condition.parent_dir = null;
  }
  db.document.dir.findOne(condition)
  .then(doc => {
    if (!doc) {
      if (null == condition.parent_dir) {
        _.extend(condition, {
          name: '',
          dirs: [],
          files: [],
          total_size: 0
        });
        return db.document.dir.insert(condition).then(rootDir => {
          res.json(rootDir);
        })
      }
      throw new ApiError(404);
    }
    return getFullPath(doc.parent_dir)
    .then(path => {
      doc.path = path;
    })
    .then(() => {
      return mapObjectIdToData(doc, 'document.dir', ['name'], ['dirs'])
    })
    .then(() => {
      return mapObjectIdToData(doc, 'document.file', ['title', 'mimetype'], ['files'])
    })
    .then(() => res.json(doc))
  })
  .catch(next);
});

api.post('/dir', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(dirSanitization, dirValidation, data);
  data[posKey] = posVal;
  checkDirValid(data.name, data.parent_dir)
  .then(() => {
    return getFullPath(data.parent_dir)
    .then(path => {
      if (path.length >= 4) {
        throw new ApiError(400, null, '最多只能创建5级目录');
      }
    })
  })
  .then(() => {
    return db.document.dir.insert(data)
    .then(doc => {
      res.json(doc)
      if (data.parent_dir) {
        return db.document.dir.update({
          _id: data.parent_dir
        }, {
          $push: {
            dirs: doc._id
          }
        })
      }
    })
  })
  .catch(next);
});

api.put('/dir/:dir_id/name', (req, res, next) => {
  let data = {
    name: req.body.name
  };
  let dir_id = ObjectId(req.params.dir_id);
  sanitizeValidateObject(_.pick(dirSanitization, 'name'), _.pick(dirValidation, 'name'), data);
  db.document.dir.findOne({
    _id: dir_id,
    [posKey]: posVal,
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(404);
    }
    return checkDirValid(data.name, doc.parent_dir)
    .then(() => {
      return db.document.dir.update({
        _id: dir_id
      }, {
        $set: data
      })
      .then(doc => res.json(doc))
    })
  })
  .catch(next);
});

api.delete('/dir/:dir_id', (req, res, next) => {
  let dir_id = ObjectId(req.params.dir_id);
  db.document.dir.findOne({
    _id: dir_id,
    [posKey]: posVal,
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(404);
    }
    if (doc.dirs.length || doc.files.length) {
      throw new ApiError(400, null, '请先删除或移动当前目录下的所有文件夹及文件');
    }
    return db.document.dir.update({
      _id: doc.parent_dir
    }, {
      $pull: {
        dirs: dir_id
      }
    })
    .then(() => {
      return db.document.dir.remove({
        _id: dir_id
      })
    })
  })
  .then(() => res.json({}))
  .catch(next);
});

api.get('/file/:file_id', (req, res, next) => {
  let file_id = ObjectId(req.params.file_id);
  db.document.file.findOne({
    _id: file_id,
    [posKey]: posVal,
  })
  .then(file => {
    if (!file) {
      throw new ApiError(404);
    }
    res.json(file);
  })
  .catch(next)
});

api.get('/file/:file_id/download', (req, res, next) => {
  let file_id = ObjectId(req.params.file_id);
  db.document.file.findOne({
    _id: file_id,
    [posKey]: posVal,
  })
  .then(fileInfo => {
    if (!fileInfo) {
      throw new ApiError(404);
    }
    if (fileInfo.path) {
      res.set('Content-disposition', 'attachment; filename=' + fileInfo.title);
      res.set('Content-type', fileInfo.mimetype);
      fs.createReadStream(fileInfo.path).pipe(res);
    }
  })
  .catch(next)
});

api.post('/upload', upload({type: 'attachment'}).array('document'), (req, res, next) => {
  let data = req.body;
  let files = [];
  let dir_id = null;
  if (data._type == 'content') {
    sanitizeValidateObject(fileSanitization, fileValidation, data);
    _.extend(data, {
      [posKey]: posVal,
      title: data.title,
      author: req.user._id,
      date_update: new Date(),
      date_create: new Date(),
      size: data.content.length
    });
    data = [data];
    dir_id = data.dir_id;
  } else if (req.files) {
    // sanitizeValidateObject(_.pick(fileSanitization, 'dir_id'), _.pick(fileValidation, 'dir_id'), data);
    dir_id = ObjectId(data.dir_id);
    data = _.map(req.files, file => {
      let fileData = _.pick(file, 'mimetype', 'path', 'size');
      return _.extend(fileData, {
        [posKey]: posVal,
        dir_id: dir_id,
        title: file.originalname,
        author: req.user._id,
        date_update: new Date(),
        date_create: new Date(),
      });
    });
  } else {
    throw new ApiError(400);
  }

  let total_size = 0;
  data.forEach(item => {
    if (item.size > max_file_size) {
      throw new ApiError(400, null, '文件大小超过上限')
    }
    total_size += item.size;
  });
  getTotalSize().then(size => {
    if ((size + total_size) > max_total_size) {
      throw new ApiError(400, null, '您的文件存储空间不足')
    }
  })

  checkDirExist(dir_id)
  .then(() => {
    return db.document.dir.findOne({
      _id: dir_id
    }, {
      files: 1
    })
    .then(dirInfo => {
      if (!dirInfo.files || !dirInfo.files.length) {
        return [];
      }
      return db.document.file.find({
        _id: {
          $in: dirInfo.files
        }
      }, {
        title: 1
      })
      .then(files => files.map(file => file.title))
    })
    .then(filenamelist => {
      data.forEach((item, i) => {
        data[i].file = getUniqName(filenamelist, data[i].file);
      })
    })
    .then(() => {
      return db.document.file.insert(data)
      .then(doc => {
        res.json(doc);
        return Promise.all([
          db.document.dir.update({
            _id: dir_id,
          }, {
            $push: {
              files: {
                $each: doc.map(item => item._id)
              }
            }
          }),
          db.document.dir.update({
            [posKey]: posVal,
            parent_dir: null
          }, {
            $inc: {
              total_size: size
            }
          })
        ])
      })
    })
  })
  .catch(next);
});

api.put('/file/:file_id', (req, res, next) => {
  let file_id = ObjectId(req.params.file_id);
  let data = req.body;
  sanitizeValidateObject(fileSanitization, fileValidation, data);
  _.extend(data, {
    date_update: new Date(),
  });
  db.document.file.update({
    _id: file_id,
  }, {
    $set: data
  })
  .then(doc => res.json(doc))
  .catch(next)
});

api.delete('/file/:file_id', (req, res, next) => {
  let file_id = ObjectId(req.params.file_id);
  db.document.file.findOne({
    _id: file_id
  }, {
    size: 1,
    dir_id: 1,
    path: 1
  })
  .then(fileInfo => {
    if (!fileInfo) {
      throw new ApiError(404);
    }
    return checkDirExist(fileInfo.dir_id)
    .then(() => {
      return Promise.all([
        db.document.file.remove({
          _id: file_id,
        }),
        db.document.dir.update({
          _id: fileInfo.dir_id,
        }, {
          $pull: {
            files: file_id
          }
        }),
        db.document.dir.update({
          [posKey]: posVal,
          parent_dir: null
        }, {
          $inc: {
            total_size: - fileInfo.size
          }
        })
      ])
    })
    .then(() => {
      try {
        fs.unlinkSync(fileInfo.path);
      } catch (e) {

      }
    })
  })
  .then(() => res.json({}))
  .catch(next)
});

api.put('/location', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(locationSanitization, locationValidation, data);
  let { files, dirs, origin_dir, target_dir } = data;
  if (origin_dir.equals(target_dir)) {
    throw new ApiError(404);
  }
  checkDirExist(target_dir)
  .then(() => {
    if (!files || !files.length) {
      return null;
    }
    return db.document.file.find({
      _id: {
        $in: files
      },
      dir_id: origin_dir
    }, {
      _id: 1
    })
    .then(list => {
      list = list.map(item => item._id);
      if (!list.length) {
        return null;
      }
      return Promise.all([
        db.document.file.update({
          _id: {
            $in: list
          }
        }, {
          $set: {
            dir_id: target_dir
          }
        }, {
          multi: true
        }),
        db.document.dir.update({
          _id: origin_dir
        }, {
          $pull: {
            files: list
          }
        }),
        db.document.dir.update({
          _id: target_dir
        }, {
          $push: {
            files: {
              $each: list
            }
          }
        })
      ])
    })
  })
  .then(() => {
    if (!dirs || !dirs.length) {
      return null;
    }
    return db.document.dir.find({
      _id: {
        $in: dirs
      },
      parent_dir: origin_dir
    }, {
      _id: 1
    })
    .then(list => {
      list = list.map(item => item._id);
      if (!list.length) {
        return null;
      }
      return Promise.all([
        db.document.dir.update({
          _id: {
            $in: list
          }
        }, {
          $set: {
            parent_dir: target_dir
          }
        }, {
          multi: true
        }),
        db.document.dir.update({
          _id: origin_dir
        }, {
          $pull: {
            dirs: list
          }
        }),
        db.document.dir.update({
          _id: target_dir
        }, {
          $push: {
            dirs: {
              $each: list
            }
          }
        })
      ])
    })
  })
  .then(() => res.json({}))
  .catch(next);
});

function checkDirValid(name, parent_dir) {
  return db.document.dir.findOne({
    _id: parent_dir,
    [posKey]: posVal,
  }, {
    parent_dir: 1,
    dirs: 1,
  })
  .then(list => {
    if (!list) {
      throw new ApiError(400, null, '父目录不存在');
    }
    // if (list.parent_dir != null) {
    //   throw new ApiError(400, null, '只能创建二级目录');
    // }
    if (list.dirs && list.dirs.length) {
      return db.document.dir.count({
        _id: {
          $in: list.dirs
        },
        name: name
      })
      .then(count => {
        if (count) {
          throw new ApiError(400, null, '存在同名的目录');
        }
      })
    }
  })
}

function checkDirExist(dir_id) {
  if (dir_id == null) {
    return Promise.resolve();
  }
  return db.document.dir.count({
    _id: dir_id,
    [posKey]: posVal,
  })
  .then(count => {
    if (!count) {
      throw new ApiError(404, null, '文件夹' + dir_id + '不存在');
    }
  })
}

function getTotalSize() {
  return db.document.dir.count({
    parent_dir: null,
    [posKey]: posVal,
  }, {
    size: 1
  })
  .then(doc => {
    return doc && doc.size ? doc.size : 0;
  })
}

function getFullPath(dir_id, path) {
  if (dir_id == null) {
    return Promise.resolve([]);
  }
  path = path || [];
  return db.document.dir.findOne({
    _id: dir_id
  }, {
    name: 1,
    parent_dir: 1
  })
  .then(doc => {
    if (doc) {
      path.unshift(doc);
      if (doc.parent_dir != null) {
        return getFullPath(doc.parent_dir, path);
      }
    }
    return path;
  })
}
