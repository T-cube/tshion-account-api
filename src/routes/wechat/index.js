import express from 'express';
import bodyParser from 'body-parser';

let api = express.Router();
export default api;

api.use('/oauth', require('./oauth').default); // wechat oauth use bodyParser.urlencoded or bodyParser.json
api.use('/bootstrap', bodyParser.json(), require('./bootstrap').default);
