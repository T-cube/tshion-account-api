var express = require('express');
var pmongo = require('pmongo');

var ApiError = require('../../lib/error').ApiError;

/* users collection */

// api.param()



var api = require('express').Router();
module.exports = api;

api.route('/test')
.get(function(req, res, next) {
  var data = {
    accessToken:2,
    uid:1,
    expires:1
  }
  res.json(data);
}).post(function(req, res, next) {
  // db.user.insert(req.body).then(function(doc) {
  //   res.json(doc);
  // }).catch(next);
  res.json(req.body);
});

api.route('/')
.get(function(req, res, next) {
  db.user.find().toArray().then(function(docs) {
    res.json(docs);
  }).catch(next);
})
.post(function(req, res, next) {
  db.user.insert(req.body).then(function(doc) {
    res.json(doc);
  }).catch(next);
});

//username,password,

api.route('/:user_id')
.get(function(req, res, next) {
  db.user.findOne({_id: pmongo.ObjectId(req.params.user_id)})
  .then(function(doc) {
    if (!doc) {
      throw new ApiError(404);
    }
    res.json(doc);
  }).catch(next);
})
.patch(function(req, res, next) {
  db.user.update(
    {_id: pmongo.ObjectId(req.params.user_id)},
    req.body
  ).toArray().then(function(doc) {
    res.json(doc);
  }).catch(next);
})
.delete(function(req, res, next) {
  db.user.remove({_id: pmongo.ObjectId(req.params.user_id)})
  .then(function(doc) {
    res.json(doc);
  }).catch(next);
});
