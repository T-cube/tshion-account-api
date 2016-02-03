var _ = require('underscore');
var express = require('express');

var api = require('express').Router();

module.exports = api;


var routes = ['login','register'];

_.each(routes, function(route){
  var path = '/' + route;
  var file = '.' + path;
  api.use(path, require(file));
});
