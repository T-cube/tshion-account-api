import express from 'express';

let api = express.Router();
export default api;

api.use('/plan', require('./plan').default);
// api.use('/alipay', require('./alipay').default);
