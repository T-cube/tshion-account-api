import express from 'express';
import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';

/* company collection */
let api = require('express').Router();
export default api;

api.get('/', (req, res, next) => {
  res.json({hello: 'list!'})
});

api.get('/search', (req, res, next) => {
  res.json({hello: 'search!', query: req.query})
});

api.get('/:task_id', (req, res, next) => {
  res.json({hello: 'task!', task_id: req.params.task_id})
});
