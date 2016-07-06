import express from 'express';

let api = express.Router();
export default api;

api.use('/template', require('./template').default);
api.use('/item', require('./item').default);
api.use('/flow', require('./flow').default);
