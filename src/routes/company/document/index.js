import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import fs from 'fs';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import {
  dirSanitization,
  dirValidation,
  fileSanitization,
  fileValidation,
  moveSanitization,
  moveValidation,
  delSanitization,
  delValidation,
} from './schema';
import upload from 'lib/upload';
import { getUniqFileName, mapObjectIdToData, fetchCompanyMemberInfo, generateToken, timestamp, indexObjectId } from 'lib/utils';
import config from 'config';
import C from 'lib/constants';

let api = express.Router();
export default api;

const max_dir_path_length = 5;

api.use((req, res, next) => {
  let max_file_size = 0;
  let max_total_size = 0;
  let posKey = req.project ? 'project_id' : 'company_id';
  let posVal = req.project ? req.project._id : req.company._id;
  if (req.project) {
    max_file_size = config.get('upload.document.project.max_file_size');
    max_total_size = config.get('upload.document.project.max_total_size');
  } else {
    max_file_size = config.get('upload.document.company.max_file_size');
    max_total_size = config.get('upload.document.company.max_total_size');
  }
  req.document = {
    posKey: posKey,
    posVal: posVal,
    max_file_size: max_file_size,
    max_total_size: max_total_size,
  };
  next();
});

api.get('/dir/:dir_id?', (req, res, next) => {
  let { search } = req.query;
  let condition = {
    [req.document.posKey]: req.document.posVal
  };
  if (req.params.dir_id) {
    condition._id = ObjectId(req.params.dir_id);
  } else {
    condition.parent_dir = null;
  }
  db.document.dir.findOne(condition)
  .then(doc => {
    if (!doc) {
      if (!condition._id && null == condition.parent_dir) {
        return createRootDir(condition);
      }
      throw new ApiError(404);
    }
    if (search) {
      return searchByName(req, doc, decodeURIComponent(search));
    }
    return mapObjectIdToData(doc, [
      ['document.dir', 'name', 'path'],
      ['document.dir', 'name,dirs,date_update,updated_by', 'dirs'],
      ['document.file', 'name,mimetype,size,date_update,updated_by', 'files'],
    ])
    .then(() => {
      return fetchCompanyMemberInfo(req.company.members, doc, 'updated_by', 'files.updated_by', 'dirs.updated_by');
    })
    .then(() => {
      doc.dirs.forEach(dir => {
        if (dir.dirs) {
          dir.dirCount = dir.dirs.length;
          delete dir.dirs;
        } else {
          dir.dirCount = 0;
        }
      });
      return doc;
    });
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/tree', (req, res, next) => {
  let condition = {
    [req.document.posKey]: req.document.posVal
  };
  db.document.dir.find(condition)
  .then(dirs => {
    if (dirs.length == 0) {
      _.extend(condition, {
        name: '',
        dirs: [],
        files: [],
        total_size: 0,
      });
      return db.document.dir.insert(condition)
      .then(rootDir => [rootDir]);
    }
    return dirs;
  })
  .then(dirs => {
    let tree = req.model('document').buildTree(dirs);
    res.json(tree);
  })
  .catch(next);
});

api.post('/dir', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(dirSanitization, dirValidation, data);
  _.extend(data, {
    files: [],
    dirs: [],
    [req.document.posKey]: req.document.posVal,
    updated_by: req.user._id,
    date_update: new Date(),
    date_create: new Date(),
  });
  checkNameValid(req, data.name, data.parent_dir)
  .then(() => {
    return getParentPaths(data.parent_dir)
    .then(path => {
      if (path.length > max_dir_path_length) {
        throw new ApiError(400, null, '最多只能创建' + max_dir_path_length + '级目录');
      }
      data.path = path;
    });
  })
  .then(() => {
    return db.document.dir.insert(data)
    .then(doc => {
      res.json(doc);
      return addActivity(req, C.ACTIVITY_ACTION.CREATE, {
        document_dir: doc._id,
        target_type: C.OBJECT_TYPE.DOCUMENT_DIR,
      })
      .then(() => {
        if (data.parent_dir) {
          return db.document.dir.update({
            _id: data.parent_dir
          }, {
            $push: {
              dirs: doc._id
            }
          });
        }
      });
    });
  })
  .catch(next);
});

api.put('/dir/:dir_id/name', (req, res, next) => {
  let data = {
    name: req.body.name
  };
  let dir_id = ObjectId(req.params.dir_id);
  sanitizeValidateObject(_.pick(dirSanitization, 'name'), _.pick(dirValidation, 'name'), data);
  _.extend(data, {
    updated_by: req.user._id,
    date_update: new Date(),
  });
  db.document.dir.findOne({
    _id: dir_id,
    [req.document.posKey]: req.document.posVal,
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(404);
    }
    return checkNameValid(req, data.name, doc.parent_dir)
    .then(() => {
      return db.document.dir.update({
        _id: dir_id
      }, {
        $set: data
      });
    })
    .then(doc => res.json(doc));
  })
  // .then(() => addActivity(req, C.ACTIVITY_ACTION.UPDATE, {
  //   document_dir: doc._id,
  //   target_type: C.OBJECT_TYPE.DOCUMENT_DIR)
  // })
  .catch(next);
});

api.delete('/', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(delSanitization, delValidation, data);
  Promise.all([deleteDirs(req, data.dirs), deleteFiles(req, data.files)])
  .then(() => res.json({}))
  .catch(next);
});

api.get('/file/:file_id', (req, res, next) => {
  let file_id = ObjectId(req.params.file_id);
  db.document.file.findOne({
    _id: file_id,
    [req.document.posKey]: req.document.posVal,
  }, {
    path: 0,
  })
  .then(file => {
    if (!file) {
      throw new ApiError(404);
    }
    res.json(file);
  })
  .catch(next);
});

api.get('/file/:file_id/token', (req, res, next) => {
  let file_id = ObjectId(req.params.file_id);
  return generateToken(48).then(token => {
    db.document.token.insert({
      token: token,
      user: req.user._id,
      file: file_id,
      expires: new Date(timestamp() + config.get('download.tokenExpires')),
    });
    res.json({ token });
  })
  .catch(next);
});

api.post('/dir/:dir_id/create', (req, res, next) => {
  let data = req.body;
  let dir_id = ObjectId(req.params.dir_id);
  sanitizeValidateObject(fileSanitization, fileValidation, data);
  _.extend(data, {
    [req.document.posKey]: req.document.posVal,
    name: data.name + '.html',
    dir_id: dir_id,
    author: req.user._id,
    date_update: new Date(),
    date_create: new Date(),
    updated_by: req.user._id,
    mimetype: 'text/plain',
    size: Buffer.byteLength(data.content, 'utf8'),
  });
  getParentPaths(dir_id)
  .then(path => {
    data.dir_path = path;
    data = [data];
    return createFile(req, data, dir_id);
  })
  .then(doc => {
    return fetchCompanyMemberInfo(req.company.members, doc, 'updated_by');
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.post('/dir/:dir_id/upload',
upload({type: 'attachment'}).array('document'),
(req, res, next) => {
  let data = [];
  let dir_id = ObjectId(req.params.dir_id);
  if (!req.files) {
    throw new ApiError(400, null, '文件未上传');
  }
  getParentPaths(dir_id)
  .then(path => {
    return Promise.map(req.files, file => {
      let fileData = _.pick(file, 'mimetype', 'url', 'path', 'relpath', 'size');
      _.extend(fileData, {
        [req.document.posKey]: req.document.posVal,
        dir_id: dir_id,
        name: file.originalname,
        author: req.user._id,
        date_update: new Date(),
        date_create: new Date(),
        updated_by: req.user._id,
        dir_path: path,
      });
      if (fileData.mimetype != 'text/plain') {
        return data.push(fileData);
      }
      return new Promise(function (resolve, reject) {
        fs.readFile(fileData.path, 'utf8', (err, content) => {
          if (err) {
            reject(err);
          }
          resolve(content);
        });
      }).then(content => {
        let file_path = fileData.path;
        _.extend(fileData, {
          content,
          path: null,
          url: null,
          relpath: null,
        });
        data.push(fileData);
        new Promise(function (resolve, reject) {
          fs.unlink(file_path, (err) => {
            if (err) {
              reject(err);
            }
            resolve();
          });
        });
      });
    });
  })
  .then(() => createFile(req, data, dir_id))
  .then(doc => {
    doc.forEach(item => {
      delete item.path;
    });
    return fetchCompanyMemberInfo(req.company.members, doc, 'updated_by');
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.put('/file/:file_id', (req, res, next) => {
  let file_id = ObjectId(req.params.file_id);
  let data = req.body;
  sanitizeValidateObject(fileSanitization, fileValidation, data);
  _.extend(data, {
    date_update: new Date(),
    updated_by: req.user._id,
  });
  db.document.file.findOne({
    _id: file_id
  }, {
    path: 1,
    name: 1,
    dir_id: 1,
  })
  .then(fileInfo => {
    if (!fileInfo) {
      throw new ApiError(404);
    }
    if (fileInfo.path) {
      if (fileInfo.name == data.name) {
        return res.json({});
      }
      data = _.pick(data, 'name');
    }
    _.extend(data, {
      date_update: new Date(),
      updated_by: req.user._id,
    });
    return getFileNameListOfDir(fileInfo.dir_id)
    .then(filenamelist => {
      data.name = getUniqFileName(filenamelist, data.name);
      return db.document.file.update({
        _id: file_id,
      }, {
        $set: data
      });
    })
    .then(doc => res.json(doc));
  })
  .catch(next);
});

api.put('/move', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(moveSanitization, moveValidation, data);
  let { files, dirs, target_dir } = data;
  return checkMoveable(target_dir, dirs, files)
  .then(() => getParentPaths(target_dir))
  .then(path => {
    let updateDirs = dirs.map(_id => {
      return db.document.dir.findOne({_id}, {
        parent_dir: 1
      })
      .then(dir => {
        return dir && dir.parent_dir && db.document.dir.update({
          _id: dir.parent_dir
        }, {
          $pull: {
            dirs: _id
          }
        });
      })
      .then(() => {
        return Promise.all([
          db.document.dir.update({_id}, {
            $set: {
              parent_dir: target_dir,
              path,
            }
          }),
          db.document.dir.update({
            _id: target_dir
          }, {
            $push: {
              dirs: _id
            }
          })
        ]);
      });
    });
    let updateFiles = files.map(_id => {
      return db.document.file.findOne({_id}, {
        dir_id: 1
      })
      .then(file => {
        return file && db.document.dir.update({
          _id: file.dir_id
        }, {
          $pull: {
            files: _id
          }
        });
      })
      .then(() => {
        return Promise.all([
          db.document.file.update({_id}, {
            $set: {
              dir_id: target_dir,
              dir_path: path,
            }
          }),
          db.document.dir.update({
            _id: target_dir
          }, {
            $push: {
              files: _id
            }
          })
        ]);
      });
    });
    return Promise.all([...updateDirs, ...updateFiles]);
  })
  .then(() => res.json({}))
  .catch(next);
});

function checkNameValid(req, name, parent_dir) {
  return db.document.dir.findOne({
    _id: parent_dir,
    [req.document.posKey]: req.document.posVal,
  }, {
    parent_dir: 1,
    dirs: 1,
  })
  .then(list => {
    if (!list) {
      throw new ApiError(400, null, '父目录不存在');
    }
    let findDirName = null;
    if (list.dirs && list.dirs.length) {
      findDirName = db.document.dir.count({
        _id: {
          $in: list.dirs
        },
        name: name
      })
      .then(count => {
        if (count) {
          throw new ApiError(400, null, '存在同名的目录');
        }
      });
    }
    return findDirName;
  });
}

function checkDirExist(req, dir_id) {
  if (!dir_id) {
    throw new ApiError(400);
  }
  return db.document.dir.count({
    _id: dir_id,
    [req.document.posKey]: req.document.posVal,
  })
  .then(count => {
    if (!count) {
      throw new ApiError(404, null, '文件夹' + dir_id + '不存在');
    }
  });
}

function getTotalSize(req) {
  return db.document.dir.count({
    parent_dir: null,
    [req.document.posKey]: req.document.posVal,
  }, {
    size: 1
  })
  .then(doc => {
    return doc && doc.size ? doc.size : 0;
  });
}

function getParentPaths(dir_id, path) {
  if (dir_id == null) {
    return Promise.resolve([]);
  }
  path = path || [];
  return db.document.dir.findOne({
    _id: dir_id
  }, {
    _id: 1,
    parent_dir: 1,
  })
  .then(doc => {
    if (doc) {
      path.unshift(doc._id);
      if (doc.parent_dir != null) {
        return getParentPaths(doc.parent_dir, path);
      }
    }
    return path;
  });
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
  });
}

function createFile(req, data, dir_id) {
  let total_size = 0;
  if (!data.length) {
    throw new ApiError(400, null, 'upload error, missing data');
  }
  data.forEach(item => {
    if (item.size > req.document.max_file_size) {
      throw new ApiError(400, null, '文件大小超过上限');
    }
    total_size += parseFloat(item.size);
  });
  getTotalSize(req).then(curSize => {
    if ((curSize + total_size) > req.document.max_total_size) {
      throw new ApiError(400, null, '您的文件存储空间不足');
    }
  });

  return checkDirExist(req, dir_id)
  .then(() => {
    return getFileNameListOfDir(dir_id)
    .then(filenamelist => {
      data.forEach((item, i) => {
        data[i].name = getUniqFileName(filenamelist, data[i].name);
        filenamelist.push(data[i].name);
      });
    })
    .then(() => {
      return db.document.file.insert(data)
      .then(doc => {
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
            [req.document.posKey]: req.document.posVal,
            parent_dir: null
          }, {
            $inc: {
              total_size: total_size
            }
          })
        ])
        .then(() => doc);
      });
    });
  });
}

function deleteDirs(req, dirs) {
  if (!dirs || !dirs.length) {
    return null;
  }
  return Promise.all(dirs.map(dir_id => {
    return db.document.dir.findOne({
      _id: dir_id,
      [req.document.posKey]: req.document.posVal,
    })
    .then(doc => {
      if (!doc || doc.parent_dir == null) {
        throw new ApiError(400, null, '未找到文件夹');
      }
      if ((doc.dirs && doc.dirs.length) || (doc.files && doc.files.length)) {
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
        });
      });
    });
  }));
}

function deleteFiles(req, files) {
  let incSize = 0;
  if (!files || !files.length) {
    return null;
  }
  return Promise.all(files.map(file_id => {
    return db.document.file.findOne({
      _id: file_id
    }, {
      size: 1,
      dir_id: 1,
      path: 1
    })
    .then(fileInfo => {
      if (!fileInfo) {
        throw new ApiError(400, null, '未找到文件');
      }
      incSize -= fileInfo.size;
      return checkDirExist(req, fileInfo.dir_id)
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
        ]);
      })
      .then(() => {
        fileInfo.path && fs.unlink(fileInfo.path, (err) => {
          console.error(err);
        });
      });
    });
  }))
  .then(() => {
    return db.document.dir.update({
      [req.document.posKey]: req.document.posVal,
      parent_dir: null
    }, {
      $inc: {
        total_size: incSize
      }
    });
  });
}

function getFileNameListOfDir(dir_id) {
  return db.document.dir.findOne({
    _id: dir_id
  }, {
    files: 1
  })
  .then(dirInfo => {
    return mapObjectIdToData(dirInfo.files, 'document.file', 'name')
    .then(files => files.map(file => file.name));
  });
}

function checkMoveable(target_dir, dirs, files) {
  return db.document.dir.find({
    _id: target_dir
  }, {
    files: 1,
    dirs: 1,
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(400, null, 'target dir is not found');
    }
    return mapObjectIdToData(doc, [
      ['document.dir', 'name', 'dirs'],
      ['document.file', 'name', 'files'],
    ])
    .then(doc => {
      let dirNameList = doc.dirs ? doc.dirs.map(item => item.name) : [];
      let fileNameList = doc.files ? doc.files.map(item => item.name) : [];
      return Promise.all([
        dirNameList.length && mapObjectIdToData(dirs, 'document.dir', 'name')
        .then(dirsInfo => {
          dirsInfo.forEach(dir => {
            if (_.find(dirNameList, dir.name)) {
              throw new ApiError(400, null, '存在同名或文件夹');
            }
          });
        }),
        fileNameList.length && mapObjectIdToData(files, 'document.file', 'name')
        .then(filesInfo => {
          filesInfo.forEach(file => {
            if (_.find(fileNameList, file.name)) {
              throw new ApiError(400, null, '存在同名的文件');
            }
          });
        }),
        dirs.length && getParentPaths(target_dir)
        .then(path => {
          dirs.forEach(dir => {
            if (-1 != indexObjectId(path, dir)) {
              throw new ApiError(400, null, '不能移动文件夹到其子文件夹');
            }
          });
          let length = max_dir_path_length - path.length;
          return ensurePathLengthLessThan(dirs, length);
        })
      ]);
    });
  });
}

function ensurePathLengthLessThan(dirs, length) {
  if (!dirs) {
    return;
  }
  if (length < 0) {
    throw new ApiError(400, null, `路径长度过长，超过了${max_dir_path_length}级目录`);
  }
  return db.document.dir.find({
    _id: {
      $in: dirs
    }
  }, {
    dirs: 1
  })
  .then(dirsInfo => {
    dirs = _.flatten(dirsInfo.map(dirInfo => dirInfo.dirs));
    if (dirs.length) {
      return ensurePathLengthLessThan(dirs, length - 1);
    }
  });
}

function addActivity(req, action, data) {
  let info = {
    action: action,
    company: req.company._id,
    creator: req.user._id,
  };
  req.params.project_id && (info.project = ObjectId(req.params.project_id));
  _.extend(info, data);
  return req.model('activity').insert(info);
}

function searchByName(req, dir, name) {
  return req.model('document').queryItemInfoUnderDir(dir._id, name)
  .then(doc => {
    doc = _.extend(dir, doc);
    return Promise.all([
      mapObjectIdToData(doc, 'document.dir', 'name', 'path,dirs.path,files.path'),
      fetchCompanyMemberInfo(req.company.members, doc, 'updated_by', 'files.updated_by', 'dirs.updated_by'),
    ])
    .then(() => doc);
  });
}

function createRootDir(condition) {
  _.extend(condition, {
    name: '',
    dirs: [],
    files: [],
    total_size: 0
  });
  return db.document.dir.insert(condition);
}
