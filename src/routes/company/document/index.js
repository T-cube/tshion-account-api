import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import fs from 'fs';
var async = require('async');

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
import { upload, saveCdn } from 'lib/upload';
import { getUniqFileName, mapObjectIdToData, fetchCompanyMemberInfo, generateToken, timestamp, indexObjectId } from 'lib/utils';
import config from 'config';
import C from 'lib/constants';
import CompanyLevel from 'models/company-level';

let api = express.Router();
export default api;

const max_dir_path_length = 5;

api.use((req, res, next) => {
  let posKey = req.project ? 'project_id' : 'company_id';
  let posVal = req.project ? req.project._id : req.company._id;
  req.document = {
    posKey: posKey,
    posVal: posVal
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
      return fetchCompanyMemberInfo(req.company, doc, 'updated_by', 'files.updated_by', 'dirs.updated_by');
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
        // total_size: 0,
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
        throw new ApiError(400, 'folder_path_too_long');
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
  Promise.all([deleteDirs(req, data.dirs), deleteFiles(req, data.files, true)])
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
    const qiniu = req.model('qiniu').getInstance('cdn-file');
    let url = file.url;
    file.url = qiniu.makeLink(url);
    file.download_url = qiniu.makeLink(url, file.name);
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
    return fetchCompanyMemberInfo(req.company, doc, 'updated_by');
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.post('/dir/:dir_id/upload',
upload({type: 'attachment'}).array('document'),
saveCdn('cdn-file'),
(req, res, next) => {
  let data = [];
  let dir_id = ObjectId(req.params.dir_id);
  if (!req.files || !req.files.length) {
    throw new ApiError(400, 'file_not_upload');
  }
  getParentPaths(dir_id)
  .then(path => {
    return Promise.map(req.files, file => {
      let fileData = _.pick(file, 'mimetype', 'url', 'path', 'relpath', 'size', 'cdn_bucket', 'cdn_key');
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
    doc.forEach(item => delete item.path);
    return fetchCompanyMemberInfo(req.company, doc, 'updated_by');
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
    name: 1,
    dir_id: 1,
  })
  .then(fileInfo => {
    if (!fileInfo) {
      throw new ApiError(404);
    }
    return getFileListOfDir(fileInfo.dir_id)
    .then(filelist => {
      filelist = filelist.filter(i => !i._id.equals(file_id));
      data.name = getUniqFileName(filelist.map(i => i.name), data.name);
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

// api.get('/can-create', (req, res, next) => {
//   let companyLevel = new CompanyLevel(req.company);
//   return companyLevel.canUpload(1).then(info => {
//     res.json({
//       canCreate: info.ok
//     });
//   })
//   .catch(next);
// });

api.get('/storage', (req, res, next) => {
  let companyLevel = new CompanyLevel(req.company);
  return companyLevel.getStorageInfo()
  .then(storage => res.json(storage))
  .catch(next);
});

api.get('/used-size', (req, res, next) => {
  let companyLevel = new CompanyLevel(req.company);
  return companyLevel.getUsedStorageSize(req.document.posKey == 'company_id' ? 'knowledge' : 'project', req.document.posKey)
  .then(used_size => res.json({used_size}))
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
      throw new ApiError(400, 'parent_folder_not_exists');
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
          throw new ApiError(400, 'folder_name_exists');
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
      throw new ApiError(404, 'folder_not_exists');
    }
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

function createFile(req, data, dir_id) {
  if (!data.length) {
    throw new ApiError(400, 'file_not_upload');
  }
  let total_size = 0;
  let sizes = data.map(item => parseFloat(item.size));
  data.forEach(item => {
    total_size += parseFloat(item.size);
  });
  let companyLevel = new CompanyLevel(req.company);
  return companyLevel.canUpload(sizes).then(info => {
    if (!info.ok) {
      let errorMsg;
      if (info.code == C.LEVEL_ERROR.OVER_STORE_MAX_TOTAL_SIZE) {
        errorMsg = 'over_storage';
      }
      if (info.code == C.LEVEL_ERROR.OVER_STORE_MAX_FILE_SIZE) {
        errorMsg = 'file_too_large';
      }
      async.each(data, (item, cb) => {
        item.cdn_key && req.model('qiniu').getInstance('cdn-file').delete(item.cdn_key).catch(e => console.error(e));
        fs.unlink(item.path, (e) => {
          e && console.error(e);
          cb();
        });
      }, (e) => {
        e && console.error(e);
      });
      throw new ApiError(400, errorMsg);
    }
    return checkDirExist(req, dir_id)
    .then(() => {
      return getFileListOfDir(dir_id)
      .then(filelist => {
        data.forEach((item, i) => {
          data[i].name = getUniqFileName(filelist.map(i => i.name), data[i].name);
          filelist.push({
            name: data[i].name
          });
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
            // db.document.dir.update({
            //   [req.document.posKey]: req.document.posVal,
            //   parent_dir: null
            // }, {
            //   $inc: {
            //     total_size: total_size
            //   }
            // })
          ])
          .then(() => companyLevel.updateUpload({
            size: total_size,
            target_type: req.document.posKey == 'company_id' ? 'knowledge' : 'project',
            target_id: req.document.posVal,
          }))
          .then(() => doc);
        });
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
        throw new ApiError(400, 'folder_not_exists');
      }
      // if ((doc.dirs && doc.dirs.length) || (doc.files && doc.files.length)) {
      //   throw new ApiError(400, 'folder_not_empty');
      // }
      return Promise.all([
        db.document.dir.update({
          _id: doc.parent_dir
        }, {
          $pull: {
            dirs: dir_id
          }
        }),
        doc.dirs && req.model('document').fetchItemIdsUnderDir(doc.dirs)
        .then(items => {
          return Promise.all([
            deleteFiles(req, items.files.concat(doc.files)),
            db.document.dir.remove({
              _id: {
                $in: items.dirs
              }
            })
          ]);
        })
      ])
      .then(() => {
        return db.document.dir.remove({
          _id: {
            $in: (doc.dirs || []).concat(dir_id)
          }
        });
      });
    });
  }));
}

function deleteFiles(req, files, dirCheckAndPull) {
  if (!files || !files.length) {
    return null;
  }
  let incSize = 0;
  return Promise.all(files.map(file_id => {
    return db.document.file.findOne({
      _id: file_id
    }, {
      size: 1,
      dir_id: 1,
      path: 1,
      cdn_key: 1,
    })
    .then(fileInfo => {
      if (!fileInfo) {
        throw new ApiError(400, 'file_not_exists');
      }
      let removeFileFromDb;
      if (dirCheckAndPull) {
        removeFileFromDb = checkDirExist(req, fileInfo.dir_id).then(() => {
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
        });
      } else {
        removeFileFromDb = db.document.file.remove({
          _id: file_id,
        });
      }
      return removeFileFromDb.then(() => {
        incSize -= fileInfo.size;
        fileInfo.path && fs.unlink(fileInfo.path, e => e && console.error(e));
        fileInfo.cdn_key && req.model('qiniu').getInstance('cdn-file').delete(fileInfo.cdn_key).catch(e => console.error(e));
      });
    });
  }))
  .then(() => {
    let companyLevel = new CompanyLevel(req.company);
    return companyLevel.updateUpload({
      size: incSize,
      target_type: req.document.posKey == 'company_id' ? 'knowledge' : 'project',
      target_id: req.document.posVal,
    });
  });
  // .then(() => {
  //   return db.document.dir.update({
  //     [req.document.posKey]: req.document.posVal,
  //     parent_dir: null
  //   }, {
  //     $inc: {
  //       total_size: incSize
  //     }
  //   });
  // });
}

function getFileListOfDir(dir_id) {
  return mapObjectIdToData(dir_id, 'document.dir', 'files')
  .then(dirInfo => mapObjectIdToData(dirInfo.files, 'document.file', 'name'));
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
      throw new ApiError(400, 'folder_not_exists');
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
              throw new ApiError(400, 'folder_name_exists');
            }
          });
        }),
        fileNameList.length && mapObjectIdToData(files, 'document.file', 'name')
        .then(filesInfo => {
          filesInfo.forEach(file => {
            if (_.find(fileNameList, file.name)) {
              throw new ApiError(400, 'file_name_exists');
            }
          });
        }),
        dirs.length && getParentPaths(target_dir)
        .then(path => {
          dirs.forEach(dir => {
            if (-1 != indexObjectId(path, dir)) {
              throw new ApiError(400, 'folder_path_error');
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
    throw new ApiError(400, 'folder_path_too_long');
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
      fetchCompanyMemberInfo(req.company, doc, 'updated_by', 'files.updated_by', 'dirs.updated_by'),
    ])
    .then(() => doc);
  });
}

function createRootDir(condition) {
  _.extend(condition, {
    name: '',
    dirs: [],
    files: [],
    // total_size: 0
  });
  return db.document.dir.insert(condition);
}
