import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import {
  dirSanitization,
  dirValidation,
  fileSanitization,
  fileValidation
} from './schema';
import { oauthCheck, authCheck } from 'lib/middleware';
import upload from 'lib/upload';

let api = require('express').Router();
export default api;

api.use(oauthCheck());

let posKey = null;
let posVal = null;
let uploader = () => () => {};

api.use((req, res, next) => {
  posKey = req.project_id ? 'project_id' : 'company_id';
  posVal = req.project_id || req.company._id;
  uploader = () => {
    return req.project_id
      ? upload({type: 'attachment'}).single('document')
      : upload({type: 'attachment'}).array('document');
  };
  next();
});

api.get('/:dir_id?', (req, res, next) => {
  let condition = {
    [posKey]: posVal
  };
  if (req.params.dir_id) {
    condition._id = ObjectId(req.params.dir_id);
  } else {
    condition.parent_dir = null;
  }
  db.document.dir.find(condition)
  .then(doc => {
    if (!condition._id) {
      return res.json({
        children: doc.map(item => _.pick(item, '_id', 'name'))
      })
    }
    doc = doc[0];
    if (!doc || !doc.children || doc.children.length == 0) {
      doc.children = [];
      return res.json(doc);
    }
    return db.document.dir.find({
      _id: {
        $in: list.children
      }
    }, {
      name: 1
    })
    .then(children => {
      doc.children = children;
      return res.json(doc);
    })
  })
  .catch(next);
});

api.post('/', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(dirSanitization, dirValidation, data);
  data[posKey] = posVal;
  db.document.dir.findOne({
    _id: data.parent_dir
  }, {
    children: 1
  })
  .then(list => {
    if (!list && data.parent_dir != null) {
      throw new ApiError(400, null, '父目录不存在');
    }
    if (list == null) {
      return db.document.dir.insert(data);
    }
    return db.document.dir.count({
      _id: {
        $in: list.children
      },
      name: data.name
    })
    .then(count => {
      if (count) {
        throw new ApiError(400, null, '目录' + data.name + '已存在');
      }
      return db.document.dir.insert(data);
    })
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.put('/:dir_id', (req, res, next) => {
  let data = {
    name: req.body.name
  };
  let dir_id = ObjectId(req.params.dir_id);
  sanitizeValidateObject(_.pick(dirSanitization, 'name'), _.pick(dirValidation, 'name'), data);
  data[posKey] = posVal;
  db.document.dir.update({
    _id: dir_id,
    [posKey]: posVal,
  }, {
    $set: data
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.delete('/:dir_id', (req, res, next) => {
  let dir_id = ObjectId(req.params.dir_id);
  db.document.dir.findOne({
    _id: dir_id,
    [posKey]: posVal,
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(404);
    }
    if (doc.children.length || doc.files.length) {
      throw new ApiError(400, null, '请先删除当前目录下的所有文件夹及文件');
    }
    return db.document.dir.update({
      _id: doc.parent_dir
    }, {
      $pull: {
        children: dir_id
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

api.get('/:dir_id/file', (req, res, next) => {
  let dir_id = ObjectId(req.params.dir_id);
  db.document.dir.findOne({
    _id: dir_id,
    [posKey]: posVal,
  }, {
    files: 1
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(404);
    }
    if (!doc.files || !doc.files.length) {
      return res.json([]);
    }
    return db.document.file.find({
      _id: {
        $in: doc.files
      }
    }, {
      title: 1,
      description: 1,
      author: 1,
      author: 1,
      date_update: 1,
    })
    .then(files => res.json(files))
  })
  .catch(next);
});

api.get('/:dir_id/file/:file_id', (req, res, next) => {
  let dir_id = ObjectId(req.params.dir_id);
  let file_id = ObjectId(req.params.file_id);
  db.document.file.findOne({
    _id: file_id,
    dir_id: dir_id,
  })
  .then(file => {
    if (!file) {
      throw new ApiError(404);
    }
    res.json(file);
  })
  .catch(next)
});

api.get('/:dir_id/file/:file_id/download/:item_id', (req, res, next) => {
  let dir_id = ObjectId(req.params.dir_id);
  let file_id = ObjectId(req.params.file_id);
  let item_id = ObjectId(req.params.item_id);
  db.document.file.findOne({
    _id: file_id,
    dir_id: dir_id,
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(404);
    }
    download(_.find(doc.files, file => file._id.equals(item_id)).path); // TODO
  })
  .catch(next)
});

api.get('/:dir_id/file/:file_id/download', (req, res, next) => {
  let dir_id = ObjectId(req.params.dir_id);
  let file_id = ObjectId(req.params.file_id);
  db.document.file.findOne({
    _id: file_id,
    dir_id: dir_id,
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(404);
    }
    if (doc.file) {
      download(doc.file.path); // TODO
    }
  })
  .catch(next)
});

api.post('/:dir_id/file',
  uploader(),
  (req, res, next) => {
  let dir_id = ObjectId(req.params.dir_id);
  let data = req.body;
  sanitizeValidateObject(fileSanitization, fileValidation, data);
  _.extend(data, {
    dir_id: dir_id,
    author: req.user._id,
    date_update: new Date(),
    date_create: new Date(),
  });
  if (req.files) {
    _.extend(data, {
      files: _.map(req.files, file => _.extend(_.pick(file, 'mimetype', 'path'), {
        _id: ObjectId()
      }))
    });
  } else if (req.file) {
    _.extend(data, {
      file: _.pick(req.file, 'mimetype', 'path')
    });
  }
  checkDir(dir_id, req.company._id)
  .then(() => {
    return db.document.file.insert(data)
    .then(doc => {
      res.json(doc);
      return db.document.dir.update({
        _id: dir_id,
        [posKey]: posVal,
      }, {
        $push: {
          files: doc._id
        }
      })
    })
  })
  .catch(next);
});

api.put('/:dir_id/file/:file_id', (req, res, next) => {
  let dir_id = ObjectId(req.params.dir_id);
  let file_id = ObjectId(req.params.file_id);
  let data = req.body;
  sanitizeValidateObject(fileSanitization, fileValidation, data);
  _.extend(data, {
    date_update: new Date(),
  });
  db.document.file.update({
    _id: file_id,
    dir_id: dir_id,
  }, {
    $set: data
  })
  .then(doc => res.json(doc))
  .catch(next)
});

api.delete('/:dir_id/file/:file_id', (req, res, next) => {
  let dir_id = ObjectId(req.params.dir_id);
  let file_id = ObjectId(req.params.file_id);
  db.document.dir.update({
    _id: dir_id,
    [posKey]: posVal,
  }, {
    $pull: {
      files: file_id
    }
  })
  .then(doc => {
    // TODO remove files
    return db.document.file.remove({
      _id: file_id,
      dir_id: dir_id,
    })
  })
  .then(() => res.json({}))
  .catch(next)
});

function checkDir(dir_id, company_id) {
  return db.document.dir.count({
    _id: dir_id,
    company_id: company_id,
  })
  .then(count => {
    if (!count) {
      throw new ApiError(404);
    }
  })
}
