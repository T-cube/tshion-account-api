import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import fs from 'fs';
import path from 'path';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { validate } from './schema';
import { upload, saveCdn, isImageFile, getCdnThumbnail } from 'lib/upload';
import { getUniqFileName, mapObjectIdToData, fetchCompanyMemberInfo,
  generateToken, timestamp, findObjectIdIndex, uniqObjectIdArray } from 'lib/utils';
import config from 'config';
import C from 'lib/constants';
import CompanyLevel from 'models/company-level';

const api = express.Router();
export default api;

const max_dir_path_length = 5;

api.use((req, res, next) => {
  let posKey = req.project ? 'project_id' : 'company_id';
  let posVal = req.project ? req.project._id : req.company._id;
  req.document = {
    posKey,
    posVal,
    isProject: !!req.project,
    isCompany: !req.project,
  };
  next();
});

api.get('/dir/:dir_id?', (req, res, next) => {
  let { search, thumb_size } = req.query;
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
        return createRootDir(condition, req.user._id)
        .then(data => {
          return fetchCompanyMemberInfo(req.company, data, 'updated_by', 'files.updated_by', 'dirs.updated_by');
        });
      }
      throw new ApiError(404);
    }
    if (search) {
      return searchByName(req, doc, decodeURIComponent(search));
    }
    return mapObjectIdToData(doc, [
      ['document.dir', 'name', 'path'],
      ['document.dir', 'name,date_update,updated_by,attachment_dir', 'dirs'],
      ['document.file', 'name,mimetype,size,date_update,cdn_key,updated_by,author', 'files'],
    ])
    .then(() => {
      return fetchCompanyMemberInfo(req.company, doc, 'updated_by', 'files.updated_by', 'dirs.updated_by');
    })
    .then(() => {
      return Promise.map(doc.files, file => {
        return attachFileUrls(req, file, thumb_size);
      });
    })
    .then(() => doc);
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/tree', (req, res, next) => {
  let condition = {
    [req.document.posKey]: req.document.posVal
  };
  db.document.dir.find(condition)
  // .then(dirs => {
  //   if (dirs.length == 0) {
  //     _.extend(condition, {
  //       name: '',
  //       dirs: [],
  //       files: [],
  //     });
  //     return db.document.dir.insert(condition)
  //     .then(rootDir => [rootDir]);
  //   }
  //   return dirs;
  // })
  .then(dirs => {
    let tree = req.model('document').buildTree(dirs);
    res.json(tree);
  })
  .catch(next);
});

api.post('/attachment/dir', (req, res, next) => {
  let dir_id = ObjectId(req.body.parent_dir);
  let extra_dir = {
    name: '附件',
    parent_dir: dir_id,
    files: [],
    dirs: [],
    project_id: req.project._id,
    updated_by: req.user._id,
    company_id: req.company._id,
    date_create: new Date(),
    date_update: new Date(),
    path: [dir_id],
    attachment_dir: true,
  };
  db.document.dir.findOne({
    _id: dir_id
  }).then(rootDir => {
    if (rootDir.parent_dir) {
      res.json();
    } else {
      db.document.dir.insert(extra_dir)
      .then(extra => {
        return db.document.dir.findOneAndUpdate({
          _id: dir_id
        }, {
          $push: {
            dirs: extra._id
          }
        }, {
          returnOriginal: false,
          returnNewDocument: true,
        })
        .then(data => {
          let doc = data.value;
          return mapObjectIdToData(doc, [
            ['document.dir', 'name', 'path'],
            ['document.dir', 'name,date_update,updated_by', 'dirs'],
            ['document.file', 'name,mimetype,size,date_update,cdn_key,updated_by,author', 'files'],
          ])
          .then(() => {
            return fetchCompanyMemberInfo(req.company, doc, 'updated_by', 'files.updated_by', 'dirs.updated_by');
          })
          .then(() => {
            return Promise.map(doc.files, file => {
              return attachFileUrls(req, file);
            });
          })
          .then(() => res.json(doc));
        });
      });
    }
  })
  .catch(next);
});

api.post('/dir', (req, res, next) => {
  let data = req.body;
  validate('dir', data);
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
      if (path[1]) {
        return db.document.dir.findOne({
          _id: path[1]
        }, {
          attachment_root_dir: 1,
          attachment_dir: 1,
        })
        .then(doc => {
          if (doc.attachment_root_dir) {
            throw new ApiError(400, 'can_not_create_dir_in_root_attachment_dir');
          }
          if (doc.attachment_dir) {
            _.extend(data, {attachment_dir_file: true});
            data.path = path;
          }
        });
      } else {
        data.path = path;
      }
    });
  })
  .then(() => {
    return db.document.dir.insert(data)
    .then(doc => {
      res.json(doc);
      addActivity(req, C.ACTIVITY_ACTION.CREATE, {
        document_dir: _.pick(doc, '_id', 'name', 'path'),
        target_type: C.OBJECT_TYPE.DOCUMENT_DIR
      });
      if (data.parent_dir) {
        db.document.dir.update({
          _id: data.parent_dir
        }, {
          $push: {
            dirs: doc._id
          }
        });
      }
    });
  })
  .catch(next);
});

api.put('/dir/:dir_id/name', (req, res, next) => {
  let dir_id = ObjectId(req.params.dir_id);
  let data = {
    name: req.body.name
  };
  validate('dir', data, ['name']);
  _.extend(data, {
    updated_by: req.user._id,
    date_update: new Date(),
  });
  db.document.dir.findOne({
    _id: dir_id,
    [req.document.posKey]: req.document.posVal,
  }, {
    parent_dir: 1,
    name: 1,
    path: 1,
    attachment_dir: 1
  })
  .then(dirInfo => {
    if (!dirInfo) {
      throw new ApiError(404);
    }
    if (dirInfo.attachment_dir) {
      throw new ApiError(400,'can_not_change_attachment_dir');
    }
    return checkNameValid(req, data.name, dirInfo.parent_dir)
    .then(() => {
      return db.document.dir.update({
        _id: dir_id
      }, {
        $set: data
      });
    })
    .then(() => {
      res.json({});
      addActivity(req, C.ACTIVITY_ACTION.RENAME, {
        document_dir: {
          _id: dir_id,
          name: dirInfo.name,
          path: dirInfo.path,
          new_name: data.name,
        },
        target_type: C.OBJECT_TYPE.DOCUMENT_DIR,
      });
    });
  })
  .catch(next);
});

api.delete('/', (req, res, next) => {
  let data = req.body;
  validate('del', data);
  let {original_dir} = data;
  mapObjectIdToData(data, [
    ['document.dir', '', 'dirs'],
    ['document.file', `${req.document.posKey},name,size,dir_id,path,cdn_key,relpath`, 'files'],
  ])
  .then(() => {
    data.dirs = data.dirs.filter(dir => dir && dir[req.document.posKey].equals(req.document.posVal));
    data.files = data.files.filter(file => file && file[req.document.posKey].equals(req.document.posVal));
    let parent_dir = uniqObjectIdArray(data.dirs.map(dir => dir.parent_dir).concat(data.files.map(file => file.dir_id)));
    if (parent_dir.length != 1) {
      throw new ApiError(400);
    }
    parent_dir = parent_dir[0];
    return Promise.all([
      deleteDirs(req, data.dirs, original_dir),
      deleteFiles(req, data.files, true),
      mapObjectIdToData(parent_dir, 'document.dir', 'name,path')
    ]);
  })
  .then(document => {
    res.json({deleteDirs:document[0],deleteFiles:document[1]});
    let document_dir = document[0];
    let document_file = document[1];
    let document_path = document[2];
    let target_type;
    document_dir.length && (target_type = C.OBJECT_TYPE.DOCUMENT_DIR);
    document_file.length && (target_type = target_type ? C.OBJECT_TYPE.DOCUMENT : C.OBJECT_TYPE.DOCUMENT_FILE);
    (document_dir.length || document_file.length) && addActivity(req, C.ACTIVITY_ACTION.DELETE, {
      document_path,
      document_dir,
      document_file,
      target_type,
    });
  })
  .catch(next);
});

api.get('/file/:file_id', (req, res, next) => {
  let file_id = ObjectId(req.params.file_id);
  let { thumb_size } = req.query;
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
    let promise = Promise.resolve();
    if (file.content) {
      promise = req.model('html-helper').prepare(file.content)
      .then(content => {
        file.content = content;
      });
    }
    promise.then(() => {
      return attachFileUrls(req, file, thumb_size).then(() => {
        res.json(file);
      });
    });
  })
  .catch(next);
});

api.put('/file/:file_id', (req, res, next) => {
  let file_id = ObjectId(req.params.file_id);
  let data = req.body;
  validate('file', data);
  _.extend(data, {
    date_update: new Date(),
    updated_by: req.user._id,
  });
  db.document.file.findOne({
    _id: file_id
  }, {
    name: 1,
    dir_id: 1,
    dir_path: 1,
  })
  .then(fileInfo => {
    if (!fileInfo) {
      throw new ApiError(404);
    }
    return getFileListOfDir(fileInfo.dir_id)
    .then(filelist => {
      filelist = filelist.filter(i => !i._id.equals(file_id));
      data.name = getUniqFileName(filelist.map(i => i.name), data.name);
      let promise = Promise.resolve();
      if (data.content) {
        promise = req.model('html-helper').sanitize(data.content)
        .then(content => {
          data.content = content;
        });
      }
      return promise.then(() => {
        return db.document.file.update({
          _id: file_id,
        }, {
          $set: data
        });
      });
    })
    .then(doc => {
      res.json(doc);
      let document_file = _.pick(fileInfo, '_id', 'name', 'dir_path');
      if (fileInfo.name != data.name) {
        document_file['new_name'] = data.name;
      }
      let activityAction = !data.content ? C.ACTIVITY_ACTION.RENAME : C.ACTIVITY_ACTION.UPDATE;
      addActivity(req, activityAction, {
        document_file,
        target_type: C.OBJECT_TYPE.DOCUMENT_FILE,
      });
    });
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
  validate('file', data);
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
  return req.model('html-helper').sanitize(data.content)
  .then(content => {
    data.content = content;
    return getParentPaths(dir_id);
  })
  .then(path => {
    data.dir_path = path;
    return createFile(req, [data], dir_id).then(doc => doc[0]);
  })
  .then(doc => {
    addActivity(req, C.ACTIVITY_ACTION.CREATE, {
      document_file: _.pick(doc, '_id', 'name', 'dir_path'),
      target_type: C.OBJECT_TYPE.DOCUMENT_FILE,
    });
    return fetchCompanyMemberInfo(req.company, doc, 'updated_by');
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.post('/dir/:dir_id/upload', (req, res, next) => {
  let file_size = parseInt(req.headers['content-length']);
  let companyLevel = new CompanyLevel(req.company._id);
  return companyLevel.canUpload(file_size).then(info => {
    if (!info.ok) {
      if (info.code == C.LEVEL_ERROR.OVER_STORE_MAX_TOTAL_SIZE) {
        throw new ApiError(400, 'over_storage');
      }
      if (info.code == C.LEVEL_ERROR.OVER_STORE_MAX_FILE_SIZE) {
        throw new ApiError(400, 'file_too_large');
      }
    }
    next();
  })
  .catch(next);
},
upload({type: 'attachment'}).array('document'),
saveCdn('cdn-file'),
(req, res, next) => {
  let { thumb_size } = req.query;
  let data = [];
  let dir_id = ObjectId(req.params.dir_id);
  if (!req.files || !req.files.length) {
    throw new ApiError(400, 'file_not_upload');
  }
  getParentPaths(dir_id)
  .then(path => {
    if (path[1]) {
      return db.document.dir.findOne({
        _id: path[1]
      })
      .then(doc => {
        if (doc.attachment_dir) {
          return _uploadFileOpreation(req, data, dir_id, path, true);
        }
        _uploadFileOpreation(req, data, dir_id, path, false);
      });
    }
    _uploadFileOpreation(req, data, dir_id, path, false);
  })
  .then(() => createFile(req, data, dir_id))
  .then(files => {
    return Promise.map(files, file => attachFileUrls(req, file, thumb_size))
    .then(() => {
      return fetchCompanyMemberInfo(req.company, files, 'updated_by');
    });
  })
  .then(files => {
    res.json(files);
    addActivity(req, C.ACTIVITY_ACTION.UPLOAD, {
      document_path: files[0] && files[0].dir_path,
      document_file: files.map(file => _.pick(file, '_id', 'name')),
      target_type: C.OBJECT_TYPE.DOCUMENT_FILE,
    });
  })
  .catch(next);
});

api.post('/move', (req, res, next) => {
  let data = req.body;
  validate('move', data);
  let { files, dirs, dest_dir, original_dir } = data;
  let attachment_dir_flag;
  delete data.original_dir;
  let moveInfo = _.clone(data);
  let parent_dir;
  if (findObjectIdIndex(dirs, dest_dir) >= 0) {
    throw new ApiError(400, 'invalid_dest_dir');
  }
  db.document.dir.findOne({
    _id: dest_dir
  }, {
    attachment_root_dir: 1,
    attachment_dir: 1,
  })
  .then(dest => {
    attachment_dir_flag = dest.attachment_dir ? true : false;
    if (dest.attachment_root_dir) {
      throw new ApiError(400, 'can_not_move_to_root_attachment_dir');
    }
  })
  .then(() => mapObjectIdToData(moveInfo, [
    ['document.dir', `name,files,parent_dir,dirs,path,${req.document.posKey}`, 'dest_dir'],
    ['document.dir', `name,parent_dir,${req.document.posKey}`, 'dirs'],
    ['document.file', `name,dir_id,${req.document.posKey}`, 'files'],
  ]))
  .then(() => {
    parent_dir = uniqObjectIdArray(moveInfo.dirs.map(dir => dir.parent_dir).concat(moveInfo.files.map(file => file.dir_id)));
    if (parent_dir.length != 1) {
      throw new ApiError(400);
    }
    parent_dir = parent_dir[0];
    let filter = item => (!!item && item[req.document.posKey].equals(req.document.posVal));
    if (!filter(moveInfo.dest_dir)) {
      moveInfo.dest_dir = null;
    }
    moveInfo.dirs = moveInfo.dirs.filter(dir => filter(dir));
    moveInfo.files = moveInfo.files.filter(file => filter(file));
  })
  .then(() => checkMoveable(moveInfo.dest_dir, moveInfo.dirs, moveInfo.files))
  .then(() => getParentPaths(dest_dir))
  .then(path => {
    let updateDirs = Promise.map(moveInfo.dirs, dir => {
      return db.document.dir.update({
        _id: dir.parent_dir
      }, {
        $pull: {
          dirs: dir._id
        }
      })
      .then(() => {
        return Promise.all([
          db.document.dir.update({
            _id: dir._id
          }, {
            $set: {
              parent_dir: dest_dir,
              path,
              attachment_dir_file: attachment_dir_flag
            }
          }),
          db.document.dir.update({
            _id: dest_dir
          }, {
            $push: {
              dirs: dir._id
            }
          })
        ]);
      });
    });
    let updateFiles = Promise.map(moveInfo.files, file => {
      return db.document.dir.update({
        _id: file.dir_id
      }, {
        $pull: {
          files: file._id
        }
      })
      .then(() => {
        return Promise.all([
          db.document.file.update({
            _id: file._id
          }, {
            $set: {
              dir_id: dest_dir,
              dir_path: path,
              attachment_dir_file: attachment_dir_flag
            }
          }),
          db.document.dir.update({
            _id: dest_dir
          }, {
            $push: {
              files: file._id
            }
          })
        ]);
      });
    });
    return Promise.all([updateDirs, updateFiles]);
  })
  .then(() => {
    res.json({});
    let target_type;
    moveInfo.dirs.length && (target_type = C.OBJECT_TYPE.DOCUMENT_DIR);
    moveInfo.files.length && (target_type = target_type ? C.OBJECT_TYPE.DOCUMENT : C.OBJECT_TYPE.DOCUMENT_FILE);
    mapObjectIdToData(parent_dir, 'document.dir', 'name,path')
    .then(document_path => {
      let activityExt = {
        document_path,
        dest_dir: _.pick(moveInfo.dest_dir, '_id', 'name', 'path'),
        document_dir: moveInfo.dirs.map(dir => _.pick(dir, '_id', 'name', 'path')),
        document_file: moveInfo.files.map(file => _.pick(file, '_id', 'name', 'dir_path')),
        target_type,
      };
      return addActivity(req, C.ACTIVITY_ACTION.MOVE, activityExt);
    });
  })
  .catch(next);
});

api.get('/storage', (req, res, next) => {
  let companyLevel = new CompanyLevel(req.company._id);
  return companyLevel.getStatus()
  .then(status => res.json(status.levelInfo.file))
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
  data.forEach(item => {
    total_size += parseFloat(item.size);
  });
  let companyLevel = new CompanyLevel(req.company._id);
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
        return db.document.dir.update({
          _id: dir_id,
        }, {
          $push: {
            files: {
              $each: doc.map(item => item._id)
            }
          }
        })
        .then(() => companyLevel.updateUpload({
          size: total_size,
          target_type: req.document.isCompany ? 'knowledge' : 'project',
          target_id: req.document.posVal,
        }))
        .then(() => doc);
      });
    });
  });
}

/**
 * @return array dirs deleted [{_id: ObjectId, name: String}]
 */
function deleteDirs(req, dirs) {
  if (!dirs || !dirs.length) {
    return Promise.resolve([]);
  }
  let dirsDeleted = [];
  return Promise.all(dirs.map(dir => {
    if (!dir || dir.parent_dir == null) {
      return null;
    }
    return db.document.dir.findOne({_id: dir._id})
    .then(doc => {
      if (doc.attachment_dir) {
        return null;
      }
      dirsDeleted.push(_.pick(dir, '_id', 'name'));
      return Promise.all([
        db.document.dir.update({
          _id: dir.parent_dir
        }, {
          $pull: {
            dirs: dir._id
          }
        }),
        dir.dirs && req.model('document').fetchItemIdsUnderDir(dir.dirs)
        .then(items => {
          return Promise.all([
            mapObjectIdToData(items.files.concat(dir.files), 'document.file', 'name,size,dir_id,path,cdn_key')
            .then(files => deleteFiles(req, files)),
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
            $in: (dir.dirs || []).concat(dir._id)
          }
        });
      });
    });
  }))
  .then(() => dirsDeleted);
}

/**
 * @return array files deleted [{_id: ObjectId, name: String}]
 */
function deleteFiles(req, files, dirCheckAndPull) {
  if (!files || !files.length) {
    return Promise.resolve([]);
  }
  let incSize = 0;
  let filesDeleted = [];
  return Promise.all(files.map(file => {
    filesDeleted.push(_.pick(file, '_id', 'name'));
    let removeFileFromDb;
    if (dirCheckAndPull) {
      removeFileFromDb = checkDirExist(req, file.dir_id).then(() => {
        return Promise.all([
          db.document.file.remove({
            _id: file._id,
          }),
          db.document.dir.update({
            _id: file.dir_id,
          }, {
            $pull: {
              files: file._id
            }
          }),
        ]);
      });
    } else {
      removeFileFromDb = db.document.file.remove({
        _id: file._id,
      });
    }
    return removeFileFromDb.then(() => {
      incSize -= file.size;
      req.model('document').deleteFile(req, file);
    });
  }))
  .then(() => {
    let companyLevel = new CompanyLevel(req.company._id);
    return companyLevel.updateUpload({
      size: incSize,
      target_type: req.document.posKey == 'company_id' ? 'knowledge' : 'project',
      target_id: req.document.posVal,
    });
  })
  .then(() => filesDeleted);
}

function getFileListOfDir(dir_id) {
  return mapObjectIdToData(dir_id, 'document.dir', 'files')
  .then(dirInfo => mapObjectIdToData(dirInfo.files, 'document.file', 'name'));
}

function checkMoveable(dest_dir, dirs, files) {
  if (!dest_dir) {
    throw new ApiError(400, 'folder_not_exists');
  }
  return mapObjectIdToData(dest_dir, [
    ['document.dir', 'name', 'dirs'],
    ['document.file', 'name', 'files'],
  ])
  .then(doc => {
    let dirNameList = doc.dirs ? doc.dirs.map(item => item.name) : [];
    let fileNameList = doc.files ? doc.files.map(item => item.name) : [];
    dirs.forEach(dir => {
      if (_.contains(dirNameList, dir.name)) {
        throw new ApiError(400, 'folder_name_exists');
      }
    });
    files.forEach(file => {
      if (_.contains(fileNameList, file.name)) {
        throw new ApiError(400, 'file_name_exists');
      }
    });
    return Promise.all([
      dirs.length && getParentPaths(dest_dir._id)
      .then(path => {
        dirs.forEach(dir => {
          if (-1 != findObjectIdIndex(path, dir)) {
            throw new ApiError(400, 'folder_path_error');
          }
        });
        let length = max_dir_path_length - path.length;
        return ensurePathLengthLessThan(dirs, length);
      })
    ]);
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
    creator: req.user._id,
  };
  if (req.project) {
    info.project = req.project._id;
    info.company_id = req.company._id;
  } else {
    info.company = req.company._id;
  }
  _.extend(info, data);
  // if (req.project) {
  //   let exts = {
  //     company_id: req.company._id
  //   };
  //   ['document_dir', 'document_file', 'dest_dir'].forEach(key => {
  //     if (info[key]) {
  //       if (_.isArray(info[key])) {
  //         info[key] = info[key].map(i => _.extend({}, exts, i));
  //       } else {
  //         info[key] = _.extend({}, exts, info[key]);
  //       }
  //     }
  //   });
  // }
  return mapObjectIdToData(info, 'document.dir', 'name', 'document_path,document_path.path,document_dir.path,document_file.dir_path,dest_dir.path')
  .then(() => req.model('activity').insert(info));
}

function searchByName(req, dir, name) {
  return req.model('document').queryItemInfoUnderDir(dir._id, name)
  .then(doc => {
    doc = _.extend(dir, doc);
    return Promise.all([
      mapObjectIdToData(doc, 'document.dir', 'name', 'path,dirs.path,files.path'),
      fetchCompanyMemberInfo(req.company, doc, 'updated_by', 'files.updated_by', 'dirs.updated_by'),
    ])
    .then(() => {
      return Promise.map(doc.files, file => {
        return attachFileUrls(req, file);
      })
      .then(() => {
        return doc;
      });
    });
  });
}

function createRootDir(condition, user_id) {
  _.extend(condition, {
    name: '',
    dirs: [],
    files: [],
    // total_size: 0
  });
  return db.document.dir.insert(condition)
  .then(root => {
    let extra_dir = {
      name: '附件',
      parent_dir: root._id,
      files: [],
      dirs: [],
      project_id: condition.project_id,
      company_id: condition.company_id,
      updated_by: user_id,
      date_create: new Date(),
      date_update: new Date(),
      path: [root._id],
      attachment_dir: true,
    };
    return db.document.dir.insert(extra_dir)
    .then(doc => {
      return db.document.dir.findOneAndUpdate({
        _id: root._id
      }, {
        $push: {
          dirs: doc._id
        }
      }, {
        returnOriginal: false,
        returnNewDocument: true,
      })
      .then(data => {
        return mapObjectIdToData(data.value, 'document.dir', 'name,date_update,updated_by,attachment_dir', 'dirs')
        .then(() => {
          return data.value;
        });
      });
    });
  });
}

function generateFileToken(user_id, file_id) {
  return generateToken(48).then(token => {
    return db.document.token.insert({
      token: token,
      user: user_id,
      file: file_id,
      expires: new Date(timestamp() + config.get('download.tokenExpires')),
    });
  });
}

function _uploadFileOpreation(req, data, dir_id, path, attachment_check) {
  return _.map(req.files, file => {
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
      path: undefined,
    });
    if (attachment_check) {
      _.extend(fileData, {
        attachment_dir_file: true
      });
    }
    data.push(fileData);
  });
}

export function attachFileUrls(req, file, thumb_size = '32') {
  const qiniu = req.model('qiniu').bucket('cdn-file');
  if (!file.cdn_key) {
    if (path.extname(file.name) == '.html') {
      return generateFileToken(req.user._id, file._id)
      .then(token => {
        file.download_url = `${config.get('apiUrl')}api/file/download/${file._id}/token/${token.token}`;
      });
    } else {
      return Promise.resolve();
    }
  }
  let promises = [
    qiniu.makeLink(file.cdn_key).then(link => {
      file.preview_url = link;
    }),
    qiniu.makeLink(file.cdn_key, file.name).then(link => {
      file.download_url = link;
    }),
  ];
  if (isImageFile(file.name)) {
    if (!/^\d+(,\d+)?/.test(thumb_size)) {
      return Promise.reject('invalid thumbnail size!');
    }
    let sizes = thumb_size.split(',');
    let thumb_width = parseInt(sizes[0]);
    let thumb_height = parseInt(sizes[1]);
    if (!thumb_height) {
      thumb_height = thumb_width;
    }
    if (thumb_width > 1000 || thumb_height > 1000) {
      return Promise.reject('thumbnail size should less than 1000!');
    }
    promises.push(
      qiniu.getThumbnailUrl(file.cdn_key, thumb_width, thumb_height).then(link => {
        file.thumbnail_url = link;
      })
    );
  }
  return Promise.all(promises);
}
