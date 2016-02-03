var express = require('express');
var pmongo = require('pmongo');
import md5 from 'blueimp-md5';


var ApiError = require('../../lib/error').ApiError;

var api = require('express').Router();
module.exports = api;

api.route('/test')
.get(function(req, res, next) {
  var data = {
    accessToken:'1201212wqwq',
    uid:1,
    expires:1
  }
  res.json(data);
}).post(function(req, res, next) {
  // db.users.insert(req.body).then(function(doc) {
  //   res.json(doc);
  // }).catch(next);
  res.json(req.body);
});

api.route('/')
.get(function(req, res, next) {
  var data = {
    accessToken:'1201212wqwq',
    uid:1,
    expires:1
  }
  res.json(data);
}).post(function(req, res, next) {

  if(req.body.pass !== 'undefined'){
    req.body.password = md5(req.body.pass);
  }
  db.users.findOne({username:req.body.username,password:req.body.password})
  .then(function(doc) {
    if (!doc) {
      throw new ApiError(404);
    }
    res.json(doc);
  }).catch(next);
  //res.json(req.body);
});
