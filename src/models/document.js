// TLifang project
// company structure class
// by alphakevin <antmary@126.com>

import _ from 'underscore';
import { ObjectId } from 'mongodb';

import db from 'lib/database';

class Document {

  constructor() {
  }

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
      return _.pick(dir, '_id', 'name', 'children');
    });
  }

  buildTree(dirs) {
    let dir = _.findWhere(dirs, {parent_dir: null});
    dir.children = this.getChildren(dirs, dir.dirs);
    return _.pick(dir, '_id', 'name', 'children');
  }

  queryItemInfoUnderDir(dir, name) {
    return this.fetchItemIdsUnderDir(dir)
    .then(items => {
      return Promise.all([
        db.document.file.find({
          _id: {
            $in: items.files
          },
          name: {
            $regex: RegExp(name, 'i')
          },
        }, {
          name: 1,
          mimetype: 1,
          size: 1,
          date_update: 1,
          updated_by: 1
        })
        .then(files => {
          items.files = files;
        }),
        db.document.dir.find({
          _id: {
            $in: items.dirs
          },
          name: {
            $regex: RegExp(name, 'i')
          },
        }, {
          name: 1,
          date_update: 1,
          updated_by: 1
        })
        .then(dirs => {
          items.dirs = dirs;
        })
      ])
      .then(() => items);
    });
  }

  fetchItemIdsUnderDir(dir, items) {
    items = items || {
      files: [],
      dirs: [],
    };
    let { files, dirs } = items;
    dir = ObjectId.isValid(dir) ? [dir] : dir;
    if (!dir || !dir.length) {
      return Promise.resolve(items);
    }
    return db.document.dir.find({
      _id: {
        $in: dir
      }
    }, {
      files: 1,
      dirs: 1,
    })
    .then(doc => {
      let childDirs = _.flatten(doc.map(item => item.dirs)).filter(i => ObjectId.isValid(i));
      items.files = files.concat(_.flatten(doc.map(item => item.files)) || []);
      items.dirs = dirs.concat(childDirs || []);
      return this.fetchItemIdsUnderDir(childDirs, items);
    })
    .then(items => items);
  }

}

export default Document;
