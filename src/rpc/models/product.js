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
    let date_update = new Date();

    // 非人数续费不能有数量的优惠
    let canHasNumberDiscount = true;

    return this.db.payment.product.findOne({_id})
    .then(lastVersionProduct => {
      if (!lastVersionProduct) {
        throw new ApiError(400, 'invalid product');
      }
      if (lastVersionProduct.product_no == C.PRODUCT_NO.PLAN) {
        canHasNumberDiscount = false;
      }
      let originalProduct = _.pick(lastVersionProduct, ..._.keys(fields));
      if (_.isEqual(originalProduct, fields)) {
        return false;
      }
      delete lastVersionProduct._id;
      lastVersionProduct.date_update = date_update;

      return this.db.payment.product.history.insert(lastVersionProduct)
      .then(() => true);
    })
    .then(isModified => {
      if (!isModified) {
        return {
          ok: 1,
          nModified: 0
        };
      }
      fields.date_update = date_update;
      let promise;
      if (!fields.discount.length) {
        promise = Promise.resolve([]);
      } else {
        promise = this.db.payment.discount.find({
          _id: {$in: fields.discount},
          status: C.DISCOUNT_STATUS.NORMAL,
        }, {
          _id: 1,
          discount: 1
        })
        .then(discounts => {
          canHasNumberDiscount || discounts.forEach(item => {
            if (item.discount.type == 'number') {
              throw new ApiError(400, 'plan cannot has number discount');
            }
          });
          return _.pluck(discounts, '_id');
        });
      }
      return promise.then(discounts => {
        fields.discount = discounts;
        return this.db.payment.product.update({_id}, {
          $set: fields,
          $inc: {
            version: 1
          }
        });
      });
    });
  }

  getHistory(product_id, {page, pagesize}) {
    return this.db.payment.product.findOne({
      _id: product_id
    }, {
      product_id: 1
    })
    .then(doc => {
      if (!doc) {
        throw new ApiError(400, 'invalid product');
      }

      let criteria = {product_id: doc.product_id};
      return Promise.all([
        this.db.payment.product.history.find(criteria, {_id: 0})
        .sort({version: -1})
        .skip(page * pagesize)
        .limit(pagesize),
        this.db.payment.product.history.count(criteria)
      ])
      .then(([list, totalRows]) => {
        return {
          list,
          page,
          pagesize,
          totalRows
        };
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
