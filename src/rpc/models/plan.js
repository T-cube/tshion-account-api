import _ from 'underscore';
import { ObjectId } from 'mongodb';

import { mapObjectIdToData } from 'lib/utils';
import Model from './model';

export default class ProductModel extends Model {

  constructor(props) {
    super(props);
  }

  fetchList(props) {
    return this.db.plan.find();
  }

  count(criteria) {
    return this.db.plan.count();
  }

  fetchDetail(_id) {
    return Promise.all([
      this.db.plan.findOne({_id}),
      this.db.payment.product.find(),
    ])
    .then(([plans, products]) => {
      plans.forEach(plan => {
        plan.products = _.find(products, product => product.plan == plan.type);
      });
      return plans;
    });
  }

  update(_id, {title, original_price}) {
    let update = {};
    if (title) {
      update.title = title;
    }
    if (original_price) {
      update.original_price = original_price;
    }
    if (_.isEmpty(update)) {
      return;
    }
    update.date_update = new Date();
    return this.db.plan.update({_id}, {
      $set: update
    });
  }

}
