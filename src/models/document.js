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
            $in: items.files.map(file => file._id)
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
          files.forEach(file => _.extend(file, _.find(items.files, v => v._id.equals(file._id))));
          items.files = files;
        }),
        db.document.dir.find({
          _id: {
            $in: items.dirs.map(dir => dir._id)
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
          dirs.forEach(dir => _.extend(dir, _.find(items.dirs, v => v._id.equals(dir._id))));
          items.dirs = dirs;
        })
      ])
      .then(() => items);
    });
  }

  /**
   * @return { files: [{_id: Objectid, path: file_path}...], dirs: [{_id: Objectid, path: dir_path}...] }
   */
  fetchItemIdsUnderDir(searchDirs, items) {
    items = items || {
      files: [],
      dirs: [],
    };
    searchDirs = ObjectId.isValid(searchDirs) ? [{
      _id: searchDirs,
      path: [],
    }] : searchDirs;
    if (!searchDirs || !searchDirs.length) {
      return Promise.resolve(items);
    }
    return db.document.dir.find({
      _id: {
        $in: searchDirs.map(v => v._id)
      }
    }, {
      files: 1,
      dirs: 1,
      name: 1,
    })
    .then(doc => {
      let childDirs = _.flatten(doc.map(item => item.dirs.map(_id => ({_id, path: _.find(searchDirs, v => v._id.equals(item._id)).path.concat(_.pick(item, '_id', 'name'))}))));
      items.files = items.files.concat((_.flatten(doc.map(item => item.files.map(_id => ({_id, path: _.find(searchDirs, v => v._id.equals(item._id)).path.concat(_.pick(item, '_id', 'name'))}))))) || []);
      items.dirs = items.dirs.concat(childDirs || []);
      return this.fetchItemIdsUnderDir(childDirs, items);
    })
    .then(items => items);
  }

}

export default Document;
