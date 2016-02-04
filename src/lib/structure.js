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

  addMember(member, node_id) {
    node_id = ObjectId(node_id);
    let node = this.findNodeById(node_id);
    if (typeof node.members !== 'array') {
      node.members = [];
    }
    node.members.push(member);
    return member;
  }

  _deleteMember(node, member_id, all = false) {
    if (!node || !node._id) return null;
    if (typeof node.members == 'array') {
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
