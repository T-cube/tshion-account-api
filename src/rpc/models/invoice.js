import _ from 'underscore';
import { ObjectId } from 'mongodb';

import C from 'lib/constants';
import { mapObjectIdToData } from 'lib/utils';
import { ApiError } from 'lib/error';
import Model from './model';

export default class InvoiceModel extends Model {

  constructor(props) {
    super(props);
  }

  fetchList(props) {
    let { page, pagesize, criteria } = props;
    if (!criteria.status || criteria.status == C.INVOICE_STATUS.CREATING) {
      criteria.status = {$ne: C.INVOICE_STATUS.CREATING};
    }
    return this.db.payment.invoice.find(criteria)
    .skip(page * pagesize)
    .limit(pagesize)
    .sort({
      _id: -1,
    });
  }

  count(criteria) {
    return this.db.payment.invoice.count(criteria);
  }

  fetchDetail(_id) {
    return this.db.payment.invoice.findOne({_id});
  }

  updateStatus({invoice_id, status}) {
    let criteria = {
      _id: invoice_id
    };
    if (status == C.INVOICE_STATUS.FINISHED) {
      criteria.status = C.INVOICE_STATUS.SENT;
    } else {
      criteria.status = {$ne: C.INVOICE_STATUS.CREATING};
    }
    return this.db.payment.invoice.update(criteria, {
      $set: {status}
    });
  }

  send({invoice_id, chip_info}) {
    return this.db.payment.invoice.update({
      _id: invoice_id,
      status: C.INVOICE_STATUS.VERIFIED
    }, {
      $set: {
        chip_info,
        status: C.INVOICE_STATUS.SENT
      }
    });
  }

}
