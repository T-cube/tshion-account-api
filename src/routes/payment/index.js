import express from 'express';

const api = express.Router();
export default api;

api.use('/plan', require('./plan').default);
