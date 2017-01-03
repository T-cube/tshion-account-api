import _ from 'underscore';
import express from 'express';
import Promise from 'bluebird';

import C, {ENUMS} from 'lib/constants';
import db from 'lib/database';
import { ApiError } from 'lib/error';
import { mapObjectIdToData, getPageInfo } from 'lib/utils';
import Plan from 'models/plan/plan';
import Product from 'models/plan/product';
import Payment from 'models/plan/payment';
import PlanDegrade from 'models/plan/plan-degrade';
import { checkUserType } from '../utils';

let api = express.Router();
export default api;

// api.use(checkUserType(C.COMPANY_MEMBER_TYPE.OWNER));

api.get('/list', (req, res, next) => {
  return Promise.all([
    db.plan.find(),
    db.payment.product.find()
  ])
  .then(([plans, products]) => {
    plans.forEach(plan => {
      plan.products = _.filter(products, product => product.plan == plan.type);
    });
    res.json(plans);
  })
  .catch(next);
});

api.get('/status', (req, res, next) => {
  new Plan(req.company._id).getStatus()
  .then(info => mapObjectIdToData(info, 'payment.order', 'plan,member_count', 'degrade.order'))
  .then(info => res.json(info))
  .catch(next);
});

api.delete('/degrade', (req, res, next) => {
  new PlanDegrade().clear(req.company._id)
  .then(doc => res.json(doc))
  .catch(next);
});

api.post('/trial', (req, res, next) => {
  let { plan } = req.body;
  let planModel = new Plan(req.company._id);
  planModel.getStatus()
  .then(status => {
    // if (!_.contains(status.certified, plan)) {
    //   throw new ApiError(400, 'team_not_certified');
    // }
    if (!_.contains(status.viable.trial, plan)) {
      throw new ApiError(400, 'trial_exists');
    }
    return planModel.createNewTrial({
      plan,
      user_id: req.user._id
    });
  })
  .then(() => res.json({}))
  .catch(next);
});

api.get('/payment', (req, res, next) => {
  let methods = [
    {
      key: 'alipay',
      title: '支付宝'
    },
    {
      key: 'wxpay',
      title: '微信支付'
    },
    {
      key: 'balance',
      title: '余额'
    }
  ];
  res.json(methods);
});

api.get('/balance', (req, res, next) => {
  let company_id = req.company._id;
  db.payment.balance.findOne({
    _id: company_id
  })
  .then(doc => {
    res.json({
      company_id,
      balance: doc ? doc.balance : 0
    });
  })
  .catch(next);
});

api.get('/product', (req, res, next) => {
  let {plan, order_type} = req.query;
  Product.getProductsWithDiscount({plan, order_type})
  .then(doc => res.json(doc))
  .catch(next);
});

api.get('/charge', (req, res, next) => {
  let company_id = req.company._id;
  let { page, pagesize } = getPageInfo(req.query);
  let { charge_type } = req.query;
  let criteria = {
    company_id,
    status: C.ORDER_STATUS.SUCCEED,
  };
  if (ENUMS.CHARGE_TYPE.indexOf(charge_type) > -1) {
    criteria.charge_type = charge_type;
  }
  return Promise.all([
    db.payment.charge.order.count(criteria),
    db.payment.charge.order.find(criteria, {
      payment_data: 0,
      payment_query: 0,
      payment_notify: 0
    })
    .sort({_id: -1})
    .limit(pagesize)
    .skip(pagesize * (page - 1)),
  ])
  .then(([totalrows, list]) => {
    res.json({
      page,
      pagesize,
      totalrows,
      list,
    });
  })
  .catch(next);
});


// api.use('/order', require('./order').default);
// api.use('/recharge', require('./recharge').default);
// api.use('/auth', require('./auth').default);
