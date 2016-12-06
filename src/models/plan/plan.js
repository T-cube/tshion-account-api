import _ from 'underscore';
import Promise from 'bluebird';
import moment from 'moment';

import { ApiError } from 'lib/error';
import C from 'lib/constants';
import db from 'lib/database';
import Auth from './auth';
import Product from './product';

export default class Plan {

  constructor(company_id) {
    this.company_id = company_id;
  }

  getNearest() {
    let { company_id } = this;
    return db.plan.company.find({company_id})
    .sort({date_start: -1})
    .limit(1)
    .then(doc => doc[0]);
  }

  createNewTrial(data) {
    data.type = 'trial';
    data.company_id = this.company_id;
    data.status = 'actived';
    data.date_start = new Date();
    data.date_end = moment().add(30, 'day').toDate();
    return db.plan.company.insert(data);
  }

  updatePaid(data) {
    data.type = 'paid';
    let { company_id } = this;
    return db.plan.company.update({
      company_id,
    }, {
      $set: data
    }, {
      upsert: true
    });
  }

  expireTrial() {
    let { company_id } = this;
    return db.plan.company.update({
      company_id,
      status: 'actived',
    }, {
      $set: {
        status: 'expired',
      }
    });
  }

  isNewTrier() {
    let { company_id } = this;
    return db.plan.company.count({company_id})
    .then(doc => !!doc);
  }

  static list() {
    return db.product.find({
      product_no: {
        $in: ['P0001', 'P0002']
      }
    })
    .then(products => {
      return [
        {
          name: '免费版',
          type: 'free',
          description: '免费团队，可使用T立方的基本功能',
          store: 1000000000,
          max_member: 10,
          products: _.filter(products, product => product.plan == 'free'),
        },
        {
          name: '专业版',
          type: 'pro',
          description: '',
          store: 10000000000,
          max_member: 50,
          products: _.filter(products, product => product.plan == 'pro'),
          ext_info: '专业版',
        },
        {
          name: '企业版',
          type: 'ent',
          description: '',
          store: 10000000000,
          max_member: 100,
          products: _.filter(products, product => product.plan == 'ent'),
          ext_info: '企业版',
        },
      ];
    });
  }

}
