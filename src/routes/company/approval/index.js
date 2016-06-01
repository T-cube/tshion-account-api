import express from 'express';
import { oauthCheck } from 'lib/middleware';

let api = express.Router();
export default api;

api.use(oauthCheck());

api.use('/template', require('./template').default);
api.use('/item', require('./item').default);
api.use('/flow', require('./flow').default);
