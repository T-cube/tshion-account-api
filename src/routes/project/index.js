import express from 'express';
import { ObjectId } from 'mongodb';
import { ApiError } from '../../lib/error';

/* company collection */
let api = require('express').Router();
export default api;

api.route('/')

  .get((req, res, next) => {
    let projects = req.company.projects || [];
    db.project.find({_id:{$in: projects}})
    .then(list => res.json(list));
  })

  .post((req, res, next) => {
    let company_id = req.params.company_id;
    if (!company_id) {
      next(new ApiError('400', 'missing_params', 'missing company_id'));
    }
    let defaults = {
      logo: null,
    }
  });
