import _ from 'underscore';
import express from 'express';
import Promise from 'bluebird';

import C, {ENUMS} from 'lib/constants';
import db from 'lib/database';
import { ApiError } from 'lib/error';
import { mapObjectIdToData, getPageInfo, findObjectIdIndex } from 'lib/utils';
import Plan from 'models/plan/plan';
import PlanProduct from 'models/plan/plan-product';
import { checkUserType } from '../utils';

const api = express.Router();
export default api;

const checkOwner = checkUserType(C.COMPANY_MEMBER_TYPE.OWNER);

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
  .then(info => {
    if (info.degrade) {
      info.viable.paid = info.viable.trial = [];
    }
    let {plan, member_count} = info.current;
    if (plan == C.TEAMPLAN.FREE) {
      info.fee_monthly = 0;
      return res.json(info);
    }
    return PlanProduct.init({plan, member_count})
    .then(planProduct => {
      info.fee_monthly = planProduct.getTotalFee();
      return db.plan.auth.findOne({
        company_id: info.company_id,
        status: C.AUTH_STATUS.ACCEPTED,
        'data.status': C.AUTH_STATUS.ACCEPTED,
      }, {
        'plan': 1,
        'data.$.info': 1,
      }).then(doc => {
        if (!doc) {
          throw new ApiError(500, 'invalid_data');
        }
        let field;
        switch (doc.plan) {
          case C.TEAMPLAN.PRO: {
            field = 'team';
            break;
          }
          case C.TEAMPLAN.ENT: {
            field = 'enterprise';
            break;
          }
          default:
            throw new ApiError(500, 'invalid_data');
        }
        if (!doc.data[0] || !doc.data[0].info[field]) {
          throw new ApiError(500, 'invalid_data');
        }
        const data = doc.data[0].info[field];
        res.json({
          ...info,
          ..._.pick(data, 'location', 'industry'),
        });
      });
    });
  })
  .catch(next);
});

api.post('/degrade/cancel', checkOwner, (req, res, next) => {
  new Plan(req.company._id).clearDegrade()
  .then(() => res.json({}))
  .catch(next);
});

api.post('/trial', checkOwner, (req, res, next) => {
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

api.get('/balance', checkOwner, (req, res, next) => {
  let company_id = req.company._id;
  db.payment.balance.findOne({
    _id: company_id
  }, {
    log: 0
  })
  .then(doc => {
    res.json({
      company_id,
      balance: doc ? doc.balance : 0
    });
  })
  .catch(next);
});

api.get('/balance/log', checkOwner, (req, res, next) => {
  let company_id = req.company._id;
  let { page, pagesize } = getPageInfo(req.query);
  db.payment.balance.findOne({
    _id: company_id
  })
  .then(doc => {
    res.json({
      page,
      pagesize,
      totalrows: doc ? doc.log.length : 0,
      list: doc && doc.log ? doc.log.slice(pagesize * (page - 1), pagesize * page) : []
    });
  })
  .catch(next);
});

api.get('/product', (req, res, next) => {
  let {plan, order_type} = req.query;
  getProductsWithDiscount(plan, order_type)
  .then(doc => res.json(doc))
  .catch(next);
});

function getProductsWithDiscount(plan, order_type) {
  let criteria;
  if (plan && _.contains(ENUMS.TEAMPLAN_PAID, plan)) {
    criteria = {plan};
  }
  return db.payment.product.find(criteria)
  .then(products => {
    let discountIds = _.flatten(_.pluck(products, 'discount'));
    if (!discountIds) {
      products.forEach(product => {
        product.discount = [];
      });
      return products;
    }
    let criteria = {
      _id: {
        $in: discountIds
      },
      'period.date_start': {$lt: new Date()},
      'period.date_end': {$gt: new Date()},
    };
    if (order_type) {
      criteria.order_type = order_type;
    }
    return db.payment.discount.find(criteria)
    .then(discounts => {
      products.forEach(product => {
        product.discount = discounts.filter(d => findObjectIdIndex(product.discount, d._id) > -1);
      });
      return products;
    });
  });
}

// charge list
// api.get('/charge', checkOwner, (req, res, next) => {
//   let company_id = req.company._id;
//   let { page, pagesize } = getPageInfo(req.query);
//   let { charge_type } = req.query;
//   let criteria = {
//     company_id,
//     status: C.ORDER_STATUS.SUCCEED,
//   };
//   if (ENUMS.CHARGE_TYPE.indexOf(charge_type) > -1) {
//     criteria.charge_type = charge_type;
//   }
//   return Promise.all([
//     db.payment.charge.order.count(criteria),
//     db.payment.charge.order.find(criteria, {
//       payment_data: 0,
//       payment_query: 0,
//       payment_notify: 0
//     })
//     .sort({_id: -1})
//     .limit(pagesize)
//     .skip(pagesize * (page - 1)),
//   ])
//   .then(([totalrows, list]) => {
//     res.json({
//       page,
//       pagesize,
//       totalrows,
//       list,
//     });
//   })
//   .catch(next);
// });


api.use('/order', checkOwner, require('./order').default);
api.use('/recharge', checkOwner, require('./recharge').default);
api.use('/auth', checkOwner, require('./auth').default);
api.use('/address', checkOwner, require('./address').default);
api.use('/invoice', checkOwner, require('./invoice').default);
