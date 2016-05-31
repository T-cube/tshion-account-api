// TLifang project
// company structure class
// by alphakevin <antmary@126.com>

import _ from 'underscore';
import { ObjectId } from 'mongodb';

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

}

export default Document;
