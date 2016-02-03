import express from 'express';
import pmongo from 'pmongo';
import { ApiError  } from '../../lib/error';
import md5 from 'blueimp-md5';

var api = express.Router();

module.exports = api;

api.route('/').post(function(req, res, next) {
  req.body.password = md5(req.body.password);
  db.users.insert(req.body).then(function(doc) {
    let data = {
      username:doc.username,
      uid:doc._id
    }
    res.json(data);
  }).catch(next);
});

api.patch('/:user_id',function(req, res, next) {
  db.users.update(
    {_id: pmongo.ObjectId(req.params.user_id)},
    {$set:req.body}
  ).then(function(doc) {
    let data = {
      name:req.body.name
    }
    res.json(doc);
  }).catch(next);
});
