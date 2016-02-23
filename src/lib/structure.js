import _ from 'underscore';
import { ObjectId } from 'mongodb';

class Structure {

  constructor(node) {
    this.root = node;
    this._counter = 0;
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
    parent.children.push(node);
    return node;
  }

  updateNode(data, node_id) {
    node_id = ObjectId(node_id);
    let node = this.findNodeById(node_id);
    if (!node) {
      return null;
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

  addPosition(position, node_id) {
    node_id = ObjectId(node_id);
    let node = this.findNodeById(node_id);
    if (!_.isArray(node.positions)) {
      node.positions = [];
    }
    if (!_.contains(node.positions, position)) {
      node.positions.push(position);
      return true;
    } else {
      return false;
    }
  }

  deletePosition(position, node_id) {
    node_id = ObjectId(node_id);
    let node = this.findNodeById(node_id);
    if (!_.isArray(node.positions)) {
      node.positions = [];
    }
    let index = _.indexOf(node.positions, position);
    if (index >= 0) {
      node.positions.splice(index, 1);
      node.members = _.reject(node.members, m => !_.contains(node.positions, m.title));
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
