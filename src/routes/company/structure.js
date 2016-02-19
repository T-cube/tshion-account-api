import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import { ApiError } from '../../lib/error';
import Structure from '../../lib/structure';

/* company collection */
let api = require('express').Router();
module.exports = api;

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
  let node = tree.addNode(data, node_id);
  if (!node) {
    return next(new ApiError('parent_node_not_exists'));
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
  save(req)
  .then(doc => res.json(doc))
  .catch(next);
});

api.delete('/:node_id', (req, res, next) => {
  let tree = req.structure;
  let node_id = req.params.node_id;
  let node = tree.deleteNode(node_id);
  save(req)
  .then(doc => res.json(doc))
  .catch(next);
});

api.post('/:node_id/position', (req, res, next) => {
  let tree = req.structure;
  let data = req.body;
  let node_id = req.params.node_id;
  let node = tree.findNodeById(node_id);
  node.positions = node.positions || [];
  if (!_.contains(node.positions, data.name)) {
    node.positions.push(data.name);
    save(req)
    .then(doc => res.json(doc))
    .catch(next);
  } else {
    next(new ApiError(400));
  }
});

api.get('/:node_id/position', (req, res, next) => {
  let tree = req.structure;
  let node_id = req.params.node_id;
  let node = tree.findNodeById(node_id);
  res.json(node.positions || []);
});

api.delete('/:node_id/position', (req, res, next) => {
  let tree = req.structure;
  let data = req.body;
  let node_id = req.params.node_id;
  let node = tree.findNodeById(node_id);
  node.positions = node.positions || [];
  node.positions = _.without(node.positions, data.name);
  if (!_.contains(node.positions, data.name)) {
    save(req)
    .then(doc => res.json(doc))
    .catch(next);
  } else {
    next(new ApiError(400));
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
  let member = tree.addMember(data, node_id);
  save(req)
  .then(doc => res.json(member))
  .catch(next);
});
