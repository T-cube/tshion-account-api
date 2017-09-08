import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import db from 'lib/database';
import C from 'lib/constants';
import { ApiError } from 'lib/error';
import Structure from 'models/structure';
import { sanitizeValidateObject } from 'lib/inspector';
import {
  nodeSanitization,
  nodeValidation,
  memberSanitization,
  memberValidation,
} from './schema';
import {
  validate
} from './nschema';
import {
  STRUCTURE_MEMBER_ADD,
  STRUCTURE_MEMBER_REMOVE,
} from 'models/notification-setting';

/* company collection */
const api = express.Router();
export default api;

api.use((req, res, next) => {
  req.structure = new Structure(req.company.structure);
  next();
});

api.get('/', (req, res, next) => {
  res.json(req.structure.object());
});

function save(req) {
  return db.company.update(
    {_id: req.company._id},
    {$set: {structure: req.structure.object()}}
  );
}

api.get('/:node_id', (req, res, next) => {
  let tree = req.structure;
  let node_id = req.params.node_id;
  let node = tree.findNodeById(node_id);
  if (!node) {
    return next(new ApiError(404, 'department_not_exists'));
  }
  res.json(node);
});

api.post('/:node_id', (req, res, next) => {
  let tree = req.structure;
  let node_id = req.params.node_id;
  let data = req.body;
  sanitizeValidateObject(nodeSanitization, nodeValidation, data);
  if (data.positions && data.positions.length) {
    data.positions = _.map(_.uniq(data.positions), item => {
      return { title: item, _id: ObjectId() };
    });
  }
  if (data.admin) {
    data.members = [{_id: data.admin}];
  }
  let node = tree.addNode(data, node_id);
  if (!node) {
    return next(new ApiError(404, 'department_not_exists'));
  }
  save(req)
  .then(() => res.json(node))
  .catch(next);
});

api.put('/:node_id', (req, res, next) => {
  let tree = req.structure;
  let node_id = req.params.node_id;
  let data = req.body;
  let node = tree.updateNode(data, node_id);
  if (node) {
    save(req)
    .then(() => res.json(node))
    .catch(next);
  } else {
    next(new ApiError(404, 'department_not_exists'));
  }
});

api.delete('/:node_id', (req, res, next) => {
  let tree = req.structure;
  let node_id = req.params.node_id;
  let node = tree.deleteNode(node_id);
  save(req)
  .then(doc => res.json(doc))
  .catch(next);
});

api.put('/:node_id/admin', (req, res, next) => {
  let tree = req.structure;
  let data = req.body;
  let node_id = req.params.node_id;
  let result = tree.setAdmin(data._id, node_id);
  if (!result) {
    throw new ApiError(404, 'department_not_exists');
  }
  save(req)
  .then(() => res.json({}))
  .catch(next);
});

api.post('/:node_id/position', (req, res, next) => {
  let tree = req.structure;
  let data = req.body;
  let node_id = req.params.node_id;
  let position = tree.addPosition(data.title, node_id);
  if (position) {
    save(req)
    .then(() => res.json(position))
    .catch(next);
  } else {
    throw new ApiError(400, 'position_exists');
  }
});

api.get('/:node_id/position', (req, res, next) => {
  let tree = req.structure;
  let node_id = req.params.node_id;
  let node = tree.findNodeById(node_id);
  res.json(node.positions || []);
});

api.put('/:node_id/position/:position_id', (req, res, next) => {
  let tree = req.structure;
  let data = req.body;
  let node_id = req.params.node_id;
  let position_id = req.params.position_id;
  let result = tree.updatePosition(data.title, position_id, node_id);
  if (result) {
    save(req)
    .then(() => res.json({}))
    .catch(next);
  } else {
    throw new ApiError(400, 'update_failed');
  }
});

api.delete('/:node_id/position/:position_id', (req, res, next) => {
  let tree = req.structure;
  let node_id = req.params.node_id;
  let position_id = req.params.position_id;
  if (tree.deletePosition(position_id, node_id)) {
    save(req)
    .then(() => res.json({}))
    .catch(next);
  } else {
    next(new ApiError(400, 'position_not_exists'));
  }
});

api.get('/:node_id/member', (req, res, next) => {
  let tree = req.structure;
  let node_id = req.params.node_id;
  let members = tree.getMemberAll(node_id);
  res.json(members);
});

api.put('/:node_id/member/:member_id', (req, res, next) => {
  let tree = req.structure;
  let { node_id, member_id } = req.params;
  let { position } = req.body;
  let member = tree.addPositionToMember(node_id, member_id, position);
  if (!member) {
    throw new ApiError(400, 'wrong_positions_or_no_members');
  }
  save(req)
  .then(() => {
    res.json(member);
  });
});

api.post('/:node_id/member', (req, res, next) => {
  let tree = req.structure;
  let node_id = req.params.node_id;
  let data = req.body;
  sanitizeValidateObject(memberSanitization, memberValidation, {data});
  let member = tree.addMember(data, node_id);
  save(req)
  .then(() => {
    res.json(member);
    let position = tree.findPositionInfo(data.position) || {};
    req.model('activity').insert({
      company: req.company._id,
      action: C.ACTIVITY_ACTION.ADD_POSITION,
      target_type: C.OBJECT_TYPE.USER,
      creator: req.user._id,
      user: data._id,
      position,
    });
    if (!req.user._id.equals(data._id)) {
      req.model('notification').send({
        company: req.company._id,
        action: C.ACTIVITY_ACTION.ADD_POSITION,
        target_type: C.OBJECT_TYPE.USER,
        from: req.user._id,
        to: ObjectId(data._id),
        position,
      }, STRUCTURE_MEMBER_ADD);
    }
  })
  .catch(next);
});

api.delete('/:node_id/member/:member_id', (req, res, next) => {
  let tree = req.structure;
  let node_id = req.params.node_id;
  let member_id = ObjectId(req.params.member_id);
  let members = tree.getMember(node_id);
  if (tree.deleteMember(member_id, node_id)) {
    save(req)
    .then(doc => {
      res.json(doc);
      let memberInfo = _.find(members, member => member._id.equals(member_id));
      let position = memberInfo ? (tree.findPositionInfo(memberInfo.position) || {}) : {};
      req.model('activity').insert({
        company: req.company._id,
        action: C.ACTIVITY_ACTION.REMOVE_POSITION,
        target_type: C.OBJECT_TYPE.USER,
        creator: req.user._id,
        user: member_id,
        position,
      });
      if (!req.user._id.equals(member_id)) {
        req.model('notification').send({
          company: req.company._id,
          action: C.ACTIVITY_ACTION.REMOVE_POSITION,
          target_type: C.OBJECT_TYPE.USER,
          from: req.user._id,
          to: member_id,
          position,
        }, STRUCTURE_MEMBER_REMOVE);
      }
    })
    .catch(next);
  } else {
    next(new ApiError(400, 'member_not_exists'));
  }
});
