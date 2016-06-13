import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import Structure from 'models/structure';
import { sanitizeValidateObject } from 'lib/inspector';
import {
  nodeSanitization,
  nodeValidation,
  memberSanitization,
  memberValidation
} from './schema';

/* company collection */
let api = require('express').Router();
export default api;

api.use((req, res, next) => {
  req.structure = new Structure(req.company.structure);
  next();
});

api.get('/', (req, res, next) => {
  console.log('aaa');
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
    return next(new ApiError(404));
  }
  res.json(node);
});

api.post('/:node_id', (req, res, next) => {
  let tree = req.structure;
  let node_id = req.params.node_id;
  let data = req.body;
  sanitizeValidateObject(nodeSanitization, nodeValidation, data);
  let node = tree.addNode(data, node_id);
  if (!node) {
    return next(new ApiError(404, null, 'node not exists'));
  }
  save(req)
  .then(doc => res.json(node))
  .catch(next);
});

api.put('/:node_id', (req, res, next) => {
  let tree = req.structure;
  let node_id = req.params.node_id;
  let data = req.body;
  let node = tree.updateNode(data, node_id);
  if (node) {
    save(req)
    .then(doc => res.json(node))
    .catch(next);
  } else {
    next(new ApiError(404));
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
    throw new ApiError(404, 'node_not_found');
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
    throw new ApiError(400, 'duplicated position name');
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
    throw new ApiError(400, 'update failed');
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
    next(new ApiError(400, 'position not found'));
  }
});

api.get('/:node_id/member', (req, res, next) => {
  let tree = req.structure;
  let node_id = req.params.node_id;
  let members = tree.getMemberAll(node_id);
  res.json(members);
});

api.post('/:node_id/member', (req, res, next) => {
  let tree = req.structure;
  let node_id = req.params.node_id;
  let data = req.body;
  sanitizeValidateObject(memberSanitization, memberValidation, data);
  let member = tree.addMember(data, node_id);
  save(req)
  .then(() => res.json(member))
  .catch(next);
});

api.delete('/:node_id/member/:member_id', (req, res, next) => {
  let tree = req.structure;
  let node_id = req.params.node_id;
  let member_id = req.params.member_id;
  if (tree.deleteMember(member_id, node_id)) {
    save(req)
    .then(doc => res.json(doc))
    .catch(next);
  } else {
    next(new ApiError(400, 'member not found'));
  }
});
