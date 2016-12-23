
import express from 'express';

// import Recharge from 'models/plan/recharge';
import { validate } from './schema';
import Recharge from 'models/plan/recharge';

let api = express.Router();

export default api;

api.get('/info', (req, res, next) => {
  let user_id = req.user._id;
  let company_id = req.company._id;
  let recharge = new Recharge({company_id, user_id});
  Promise.all([
    recharge.getLimits(),
    recharge.getChargeDiscounts(),
  ])
  .then(([limits, discounts]) => {
    res.json({limits, discounts});
  })
  .catch(next);
});

api.post('/', (req, res, next) => {
  let data = req.body;
  validate('recharge', data);
  let user_id = req.user._id;
  let company_id = req.company._id;
  let recharge = new Recharge({company_id, user_id});
  recharge.create(data)
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/:rechargeId', (req, res, next) => {

});

api.post('/:rechargeId/pay', (req, res, next) => {

});
