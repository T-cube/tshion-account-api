import express from 'express';
import C from 'lib/constants';

let api = express.Router();
export default api;


api.use('/template', require('./template').default);
api.use('/item', require('./item').default);
api.use('/flow', require('./flow').default);
api.use('/default-template', require('./default-template').default);
