import _ from 'underscore';
import { ObjectId } from 'mongodb';
import config from 'config';
import fs from 'fs';
import path from 'path';

import db from 'lib/database';
import { strToReg } from 'lib/utils';

class Document {

  getChildren(dirs, subDirIds) {
    return _.map(subDirIds, dirId => {
      let dir = _.find(dirs, d => d._id.equals(dirId));
      if (!dir) {
        return null;
      }
      let children = this.getChildren(dirs, dir.dirs);
      if (!_.isEmpty(children)) {
        dir.children = children;
      }
      return _.pick(dir, '_id', 'name', 'children', 'attachment_dir');
    });
  }

  buildTree(dirs) {
    let dir = _.find(dirs, dir => !dir.parent_dir);
    dir.children = this.getChildren(dirs, dir.dirs);
    return _.pick(dir, '_id', 'name', 'children', 'attachment_dir,attachment_root_dir,for');
  }

  queryItemInfoUnderDir(dir, name) {
    let items = {};
    return Promise.all([
      db.document.file.find({
        dir_path: dir,
        name: {
          $regex: strToReg(name, 'i')
        },
      }, {
        name: 1,
        mimetype: 1,
        size: 1,
        date_update: 1,
        updated_by: 1,
        dir_path: 1,
        cdn_key: 1,
      })
      .limit(config.get('view.maxListNum'))
      .then(files => items.files = files.map(file => {
        file.path = file.dir_path;
        delete file.dir_path;
        return file;
      })),
      db.document.dir.find({
        path: dir,
        name: {
          $regex: strToReg(name, 'i')
        },
      }, {
        name: 1,
        date_update: 1,
        updated_by: 1,
        path: 1,
      })
      .limit(config.get('view.maxListNum'))
      .then(dirs => items.dirs = dirs)
    ])
    .then(() => items);
  }

  /**
   * @return { files: [Objectid...], dirs: [Objectid...] }
   */
  fetchItemIdsUnderDir(searchDirs, items) {
    items = items || {
      files: [],
      dirs: [],
    };
    searchDirs = ObjectId.isValid(searchDirs) ? [ObjectId(searchDirs)] : searchDirs;
    if (!searchDirs || !searchDirs.length) {
      return Promise.resolve(items);
    }
    return db.document.dir.find({
      _id: {
        $in: searchDirs
      }
    }, {
      files: 1,
      dirs: 1,
    })
    .then(doc => {
      let childDirs = _.flatten(doc.map(item => item.dirs)) || [];
      items.files = items.files.concat(_.flatten(doc.map(item => item.files)) || []);
      if (childDirs.length) {
        items.dirs = items.dirs.concat(childDirs);
        return this.fetchItemIdsUnderDir(childDirs, items);
      }
      return items;
    });
  }

  deleteFile(req, file) {
    if (!file) {
      return;
    }
    file.cdn_key && req.model('qiniu').bucket('cdn-file').delete(file.cdn_key).catch(e => console.error(e));
    let dir = path.normalize(__dirname + '/../../public/cdn/' + file.relpath);
    fs.stat(dir, (err, stat) => {
      if (err) console.error(err);
      fs.unlink(dir, e => e && console.error(e));
    });
  }

}

export default Document;
