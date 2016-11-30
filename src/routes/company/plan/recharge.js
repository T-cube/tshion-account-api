
import express from 'express';

// import Recharge from 'models/plan/recharge';
import { validate } from './schema';

let api = express.Router();

export default api;


api.get('/', (req, res, next) => {

});

// api.post('/', (req, res, next) => {
//   let data = req.body;
//   validate('recharge', data);
//   new Recharge(req.company._id).create(data)
//   .then(doc => {})
//   .catch(next);
// });

api.get('/:rechargeId', (req, res, next) => {

});

api.post('/:rechargeId/pay', (req, res, next) => {

});
