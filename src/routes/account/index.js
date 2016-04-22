import _ from 'underscore'
import express from 'express';
import validator from 'express-validation';
import bcrypt from 'bcrypt';

import validation from './validation';
import { ApiError } from 'lib/error';

let api = express.Router();
export default api;

api.post('/check', validator(validation.check), (req, res, next) => {
  let { type, id } = req.body;
  db.user.find({[type]: id}).count()
  .then(count => res.json({ exists: count > 0 }));
});

api.post('/register', validator(validation.register), (req, res, next) => {
  let { type, id, password, code } = req.body;
  db.user.find({[type]: id}).count()
  .then(count => {
    console.log(bcrypt);
    if (count > 0) {
      console.log('exists!');
      throw new ApiError(400, 'account_exists');
    }
    let salt = bcrypt.genSaltSync(10);
    let hash = bcrypt.hashSync(password, salt);
    let data = {
      [type]: id,
      password: hash
    };
    db.user.insert(data)
    .then(res.json({[type]: id}));
    console.log(data);
  }).catch(next);
});
