import _ from 'underscore'
import express from 'express';
import validator from 'express-validation';
import bcrypt from 'bcrypt';

import validation from './validation';
import { ApiError } from '../../lib/error';

let api = express.Router();
export default api;

function userExistsError(type) {
  return new ApiError(400, null, [{
    field: type,
    messages: ['user account exists'],
    types: ['custom validation'],
  }]);
}

api.post('/check', validator(validation.check), (req, res, next) => {
  let { type } = req.body;
  db.user.find({[type]: req.body[type]}).count()
  .then(count => {
    if (count > 0) {
      throw userExistsError(type);
    }
    res.json({});
  }).catch(next);
});

api.post('/register', validator(validation.register), (req, res, next) => {
  let { type, password, code } = req.body;
  let id = req.body[type];
  db.user.find({[type]: id}).count()
  .then(count => {
    console.log(bcrypt);
    if (count > 0) {
      throw userExistsError(type);
    }
    let salt = bcrypt.genSaltSync(10);
    let hash = bcrypt.hashSync(password, salt);
    let data = {
      [type]: id,
      password: hash,
    };
    db.user.insert(data)
    .then(res.json({[type]: id}));
    console.log(data);
  }).catch(next);
});
