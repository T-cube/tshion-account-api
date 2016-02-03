import express from 'express';
import { ObjectId } from 'mongodb';

import { ApiError } from '../../lib/error';
import Structure from '../../lib/structure';

/* company collection */
let api = require('express').Router();
module.exports = api;

api.use((req, res, next) => {
  let structure = req.structure;
  req.structure = new Structure(structure);
  next();
});

api.get('/', (req, res, next) => {
  res.json(req.structure.object());
});

function save(structure) {
  return db.company.update(
    {_id: req.company._id},
    {$set: {structure: structure.object()}}
  );
}

api.post('/node', (req, res, next) => {
  let tree = req.structure;
  let data = req.body;
  let parent_id = data.parent_id;
  delete data[parent_id];
  let node = tree.addNode(data, parent_id);
  if (!node) {
    return next(new ApiError('parent_node_not_exists'));
  }
  save(tree.object())
  .then(doc => res.json(doc))
  .catch(next);
});

api.put('/node/:node_id', (req, res, next) => {
  let tree = req.structure;
  let data = req.body;
  let node = tree.updateNode(data, parent_id);
  save(tree.object())
  .then(doc => res.json(doc))
  .catch(next);
})
