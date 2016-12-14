import _ from 'underscore';
import { ObjectId } from 'mongodb';

import { mapObjectIdToData } from 'lib/utils';
import Model from './model';

export default class ProductModel extends Model {

  constructor(props) {
    super(props);
  }

  fetchList(props) {
    return this.db.payment.product.find()
    .then(doc => mapObjectIdToData(doc, 'payment.discount', '', 'discount'));
  }

  count(criteria) {
    return this.db.payment.product.count();
  }

  fetchDetail(_id) {
    return this.db.payment.product.findOne({_id})
    .then(doc => mapObjectIdToData(doc, 'payment.discount', '', 'discount'));
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
    return this.db.payment.product.update({_id}, {
      $set: update
    });
  }

  addDiscount(product_id, discount_id) {
    return this.db.payment.discount.count({
      _id: discount_id
    })
    .then(count => {
      if (count == 0) {
        throw new Error('invalid discount');
      }
      return this.db.payment.product.update({
        _id: product_id
      }, {
        $addToSet: {
          discounts: discount_id
        }
      });
    });
  }

  removeDiscount(product_id, discount_id) {
    return this.db.payment.product.update({
      _id: product_id
    }, {
      $pull: {
        discounts: discount_id
      }
    });
  }

}
