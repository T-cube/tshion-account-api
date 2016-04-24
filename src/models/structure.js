// TLifang project
// company structure class
// by alphakevin <antmary@126.com>

import _ from 'underscore';
import { ObjectId } from 'mongodb';
import { getUniqName } from 'lib/utils';

class Structure {

  constructor(node) {
    this.root = node;
    this._counter = 0;
  }

  getNames(node, node_id) {
    let children = node.children || [];
    if (node_id) {
      children = _.reject(node.children, _node => node_id.equals(_node._id) )
    }
    return _.pluck(children, 'name');
  }

  _findNodeById(node, node_id) {
    if (node_id.equals(node._id)) {
      return node;
    }
    if (node.children) {
      for (let k in node.children) {
        let _node = node.children[k];
        let found = this._findNodeById(_node, node_id);
        if (found) {
          return found;
        }
      }
    }
  }

  findNodeById(node_id) {
    node_id = ObjectId(node_id);
    return this._findNodeById(this.root, node_id);
  }

  _findParent(node, node_id) {
    if (node.children) {
      for (let k in node.children) {
        let _node = node.children[k];
        if (node_id.equals(_node._id)) {
          return _node;
        }
        let found = this._findParent(_node, node_id);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  findParent(node_id) {
    node_id = ObjectId(node_id);
    return this._findParent(this.root, node_id);
  }

  addNode(node, parent_id) {
    parent_id = ObjectId(parent_id);
    let parent = this.findNodeById(parent_id);
    if (!parent) {
      return null;
    }
    if (!node._id) {
      node._id = ObjectId();
    }
    if (!parent.children) {
      parent.children = [];
    }
    node.name = getUniqName(this.getNames(parent), node.name);
    parent.children.push(node);
    parent.children = _.sortBy(parent.children, 'name');
    return node;
  }

  updateNode(data, node_id) {
    node_id = ObjectId(node_id);
    let node = this.findNodeById(node_id);
    if (!node) {
      return null;
    }
    if (node !== this.root) {
      let parent = this.findParent(node_id);
      console.log(parent)
      data.name = getUniqName(this.getNames(parent, node_id), data.name);
    }
    _.extend(node, data);
    return node;
  }

  _deleteNode(node, node_id) {
    if (node.children) {
      for (let i in node.children) {
        let _node = node.children[i];
        if (node_id.equals(_node._id)) {
          node.children.splice(i, 1);
          return true;
        } else if (this._deleteNode(_node, node_id)) {
          return true;
        }
      }
    }
    return false;
  }

  deleteNode(node_id) {
    node_id = ObjectId(node_id);
    return this._deleteNode(this.root, node_id);
  }

  _getMember(node_id, all, level = 0) {
    let node = this.findNodeById(node_id);
    let members = [];
    if (!node.members) {
      node.members = [];
    }
    let _members = _.map(node.members, m => _.extend({}, m, {
      node_id: node._id,
      level: level
    }));
    members = members.concat(_members);
    if (all) {
      _.each(node.children, _node => {
        let _members = this._getMember(_node._id, all, level + 1);
        members = members.concat(_members);
      });
    }
    return members;
  }

  getMember(node_id, all = false) {
    node_id = ObjectId(node_id);
    return this._getMember(node_id, all);
  }

  getMemberAll(node_id) {
    return this.getMember(node_id, true);
  }

  addMember(member, node_id) {
    node_id = ObjectId(node_id);
    let node = this.findNodeById(node_id);
    if (!_.isArray(node.members)) {
      node.members = [];
    }
    node.members.push(member);
    return member;
  }

  _deleteMember(node, member_id, all = false) {
    if (!node || !node._id) return null;
    if (_.isArray(node.members)) {
      let index = _.findIndex(node.members, m => member_id.equals(m._id));
      if (index >= 0) {
        node.members.splice(index, 1);
        this._counter++;
      }
    }
    if (all) {
      _.each(node.children, _node => {
        this._deleteMember(_node, member_id, true);
      });
    }
  }

  deleteMemberAll(member_id) {
    member_id = ObjectId(member_id);
    this._counter = 0;
    this._deleteMember(this.root, member_id, true);
    return this._counter;
  }

  deleteMember(member_id, node_id) {
    if (node_id === undefined) {
      return this.deleteMemberAll();
    }
    member_id = ObjectId(member_id);
    node_id = ObjectId(node_id);
    let node = this.findNodeById(node_id);
    if (!node) {
      return false;
    }
    this._deleteMember(node, member_id)
    return true;
  }

  addPosition(title, node_id) {
    node_id = ObjectId(node_id);
    let node = this.findNodeById(node_id);
    if (!_.isArray(node.positions)) {
      node.positions = [];
    }
    if (!_.findWhere(node.positions, {title: title})) {
      let _id = ObjectId();
      let position = {
        _id: _id,
        title: title,
      };
      node.positions.push(position);
      return position;
    } else {
      return false;
    }
  }

  deletePosition(position_id, node_id) {
    node_id = ObjectId(node_id);
    let node = this.findNodeById(node_id);
    if (!_.isArray(node.positions)) {
      node.positions = [];
      return true;
    }
    let index = _.findIndex(node.positions, pos => pos._id.equals(position_id));
    if (index >= 0) {
      node.positions.splice(index, 1);
      node.members = _.reject(node.members, m => m._id.equals(position_id));
      return true;
    } else {
      return false;
    }
  }

  object() {
    return this.root;
  }
}

Structure.nodeDefault = () => ({
  _id: ObjectId(),
  name: 'node',
  description: ''
});

export default Structure;
