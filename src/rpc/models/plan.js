import _ from 'underscore';
import C from 'lib/constants';

import Model from './model';

export default class PlanModel extends Model {

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
    return this.db.plan.findOne({_id})
    .then(doc => {
      if (doc.type == C.TEAMPLAN.FREE) {
        return doc;
      }
      return this.db.payment.product.find({
        plan: doc.type
      }, {
        discount: 0
      })
      .then(products => {
        doc.products = products;
        return doc;
      });
    });
  }

  update(_id, {name, description}) {
    let update = {
      name,
      description,
    };
    update.date_update = new Date();
    return this.db.plan.update({_id}, {
      $set: update
    });
  }

}