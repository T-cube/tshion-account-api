// TLifang project
// company structure class
// by alphakevin <antmary@126.com>

import _ from 'underscore';
import { ObjectId } from 'mongodb';

import { getUniqName, findObjectIdIndex, uniqObjectIdArray } from 'lib/utils';

class Structure {

  constructor(node) {
    this.root = node;
    this._counter = 0;
  }

  getNames(node, node_id) {
    let children = node.children || [];
    if (node_id) {
      children = _.reject(node.children, _node => node_id.equals(_node._id) );
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

  findParentsAdmins(node_id) {
    let node = this.root;
    var result = [];
    var flag = false;
    function _search(node, index) {
      for (var i = 0; i < node.length; i++) {
        var item = node[i];
        if (item._id.equals(node_id)) {
          flag = true;
          return result[index] = item.admin;
        } else if (item.children && item.children.length) {
          result[index] = item.admin;
          _search(item.children, index + 1);
          if (flag) return;
          else result.pop();
        }
      }
    }
    if (node.children) {
      _search(node.children, 0);
      return result;
    } else {
      return result;
    }
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
      data.name = getUniqName(this.getNames(parent, node_id), data.name);
      if (!_.some(node.members, m => m._id.equals(data.admin))) {
        node.members.push({_id: data.admin});
      }
    } else {
      node.admin = data.admin;
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

  setAdmin(member_id, node_id) {
    node_id = ObjectId(node_id);
    member_id = member_id ? ObjectId(member_id) : null;
    let node = this.findNodeById(node_id);
    if (node) {
      node.admin = member_id;
      if (!_.some(node.members, m => m._id.equals(member_id))) {
        node.members.push({_id: member_id});
      }
      return true;
    }
    return false;
  }

  _getMember(node_id, all, level = 0) {
    let node = this.findNodeById(node_id);
    if (!node) {
      return false;
    }
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
    let members = this._getMember(node_id, all);
    let memberIds = uniqObjectIdArray(members.map(member => member._id));
    return memberIds.map(mid => _.find(members, member => member._id.equals(mid)));
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
    member.forEach(item => {
      node.members.push(item);
    });
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
      if (ObjectId.isValid(node.admin) && member_id.equals(node.admin)) {
        node.admin = null;
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
    if (node_id.equals(this.root._id)) {
      return true;
    }
    this._deleteMember(node, member_id);
    return true;
  }

  addPosition(title, node_id) {
    node_id = ObjectId(node_id);
    let node = this.findNodeById(node_id);
    if (node.positions == null) {
      node.positions = [];
    }
    let titles = _.pluck(node.positions, 'title');
    let position = {
      _id: ObjectId(),
      title: getUniqName(titles, title),
    };
    node.positions.push(position);
    return position;
  }

  updatePosition(title, position_id, node_id) {
    node_id = ObjectId(node_id);
    position_id = ObjectId(position_id);
    let node = this.findNodeById(node_id);
    if (node.positions == null) {
      node.positions = [];
    }
    let position = _.find(node.positions, p => p._id.equals(position_id));
    let titles = _.without(_.pluck(node.positions, 'title'), position.title);
    position.title = getUniqName(titles, title);
    return position;
  }

  deletePosition(position_id, node_id) {
    node_id = ObjectId(node_id);
    position_id = ObjectId(position_id);
    let node = this.findNodeById(node_id);
    if (!_.isArray(node.positions)) {
      node.positions = [];
      return true;
    }
    let index = _.findIndex(node.positions, pos => pos._id.equals(position_id));
    if (index >= 0) {
      node.positions.splice(index, 1);
      node.members = _.map(node.members, m => {
        if (m.position && m.position.equals(position_id)) {
          return {
            _id: m._id
          };
        } else {
          return m;
        }
      });
      return true;
    } else {
      return false;
    }
  }

  _findMemberByPosition(node, position_id, members) {
    if (!node || !node.members) {
      return members;
    }
    let nodeMembers = node.members.filter(i => i.title.equals(position_id)).map(j => j._id);
    if (nodeMembers) {
      members = members.concat(nodeMembers);
    }
    if (node.children) {
      for (let k in node.children) {
        let _node = node.children[k];
        members = this._findMemberByPosition(_node, position_id, members);
      }
    }
    return members;
  }

  findMemberByPosition(position_id) {
    position_id = ObjectId(position_id);
    return this._findMemberByPosition(this.root, position_id, []);
  }

  _findPositionInfo(node, position_id) {
    let found = null;
    if (node.positions) {
      found = _.find(node.positions, item => item._id.equals(position_id));
      if (found) {
        return found;
      }
    }
    if (node.children) {
      for (let k in node.children) {
        let _node = node.children[k];
        found = this._findPositionInfo(_node, position_id);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  findPositionInfo(position_id) {
    position_id = ObjectId(position_id);
    return this._findPositionInfo(this.root, position_id);
  }

  addPositionToMember(node_id, member_id, position) {
    node_id = ObjectId(node_id);
    member_id = ObjectId(member_id);
    position = ObjectId(position);
    let node = this.findNodeById(node_id);
    if (!_.some(node.positions, item => item._id.equals(position))) {
      return null;
    }
    return _.some(node.members, m => (m._id)&&(m._id.equals(member_id))&&(m.position = position)) ? {_id: member_id, position} : null;
  }

  findMemberDepartments(member_id, node, path) {
    let departments = [];
    node = node || this.root;
    let newPath = path ? _.clone(path) : [];
    newPath.push(node._id);
    let members = node.members || [];
    if (findObjectIdIndex(members.map(member => member._id), member_id) != -1) {
      departments = departments.concat(node._id).concat(newPath);
    }
    if (node.children && node.children.length) {
      node.children.forEach(i => {
        departments = departments.concat(this.findMemberDepartments(member_id, i, newPath));
      });
    }
    return uniqObjectIdArray(departments);
  }

  findMemberAdminDepartments(member_id, node) {
    let departments = [];
    node = node || this.root;
    if (node.admin && node.admin.equals(member_id)) {
      departments.push(node._id);
    }
    if (node.children && node.children.length) {
      node.children.forEach(i => {
        departments = departments.concat(this.findMemberAdminDepartments(member_id, i));
      });
    }
    return uniqObjectIdArray(departments);
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
