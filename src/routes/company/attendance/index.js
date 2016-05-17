import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
// import { } from './schema';
import { oauthCheck, authCheck } from 'lib/middleware';
import { mapObjectIdToData, fetchUserInfo } from 'lib/utils';
import config from 'config';

let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.post('/', (req, res, next) => {

})

api.get('/mine', (req, res, next) => {

})

api.get('/user/:user_id', (req, res, next) => {

})

api.put('/:attendance_id', (req, res, next) => {

})

api.post('/:attendance_id/check', (req, res, next) => {

})
