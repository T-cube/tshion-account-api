import _ from 'underscore';
import { ObjectId } from 'mongodb';

import C from 'lib/constants';
import { mapObjectIdToData } from 'lib/utils';
import { ApiError } from 'lib/error';
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

  update(_id, fields) {
    fields.date_update = new Date();
    if (!fields.discount.length) {
      return this.db.payment.product.update({_id}, {
        $set: fields
      });
    }
    return this.db.payment.discount.find({
      _id: {$in: fields.discount},
      status: C.DISCOUNT_STATUS.NORMAL,
    }, {_id: 1})
    .then(discounts => {
      fields.discount = _.pluck(discounts, '_id');
      return this.db.payment.product.update({_id}, {
        $set: fields
      });
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
          discount: discount_id
        }
      });
    });
  }

  removeDiscount(product_id, discount_id) {
    return this.db.payment.product.update({
      _id: product_id
    }, {
      $pull: {
        discount: discount_id
      }
    });
  }

}
