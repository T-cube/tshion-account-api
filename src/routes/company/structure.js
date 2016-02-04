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
  res.json(req.structure.object());
});

function save(req) {
  return db.company.update(
    {_id: req.company._id},
    {$set: {structure: req.structure.object()}}
  );
}

api.post('/node/:parent_id', (req, res, next) => {
  let tree = req.structure;
  let parent_id = req.params.parent_id;
  let data = req.body;
  let node = tree.addNode(data, parent_id);
  if (!node) {
    return next(new ApiError('parent_node_not_exists'));
  }
  save(req)
  .then(doc => res.json(node))
  .catch(next);
});

api.put('/node/:node_id', (req, res, next) => {
  let tree = req.structure;
  let node_id = req.params.node_id;
  let data = req.body;
  let node = tree.updateNode(data, node_id);
  save(req)
  .then(doc => res.json(doc))
  .catch(next);
});

api.delete('/node/:node_id', (req, res, next) => {
  let tree = req.structure;
  let node_id = req.params.node_id;
  let node = tree.deleteNode(data, node_id);
  save(req)
  .then(doc => res.json(doc))
  .catch(next);
});
