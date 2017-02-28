import C from 'lib/constants';
import { mapObjectIdToData } from 'lib/utils';
import { ApiError } from 'lib/error';
import Model from './model';

export default class InvoiceModel extends Model {

  constructor(props) {
    super(props);
  }

  fetchList(props) {
    let { page, pagesize, criteria = {} } = props;
    if (!criteria.status) {
      criteria.status = {$ne: C.INVOICE_STATUS.CREATING};
    }
    return this.db.payment.invoice.find(criteria, {order_list: 0})
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
    return this.db.payment.invoice.findOne({_id})
    .then(doc => mapObjectIdToData(doc, 'payment.order', 'plan,order_type,member_count,date_create,payment,paid_sum,order_no', 'order_list'));
  }

  updateStatus({invoice_id, status, operator_id, comment}) {
    let criteria = {
      _id: invoice_id
    };
    switch (status) {
    case C.INVOICE_STATUS.COMPLETED:
      criteria.status = C.INVOICE_STATUS.SHIPPED;
      break;
    case C.INVOICE_STATUS.CONFIRMED:
      criteria.status = C.INVOICE_STATUS.CREATED;
      break;
    case C.INVOICE_STATUS.REJECTED:
      criteria.status = C.INVOICE_STATUS.CREATED;
      break;
    case C.INVOICE_STATUS.ISSUED:
      criteria.status = C.INVOICE_STATUS.CONFIRMED;
      break;
    default:
      criteria.status = {$ne: C.INVOICE_STATUS.CREATING};
    }
    return this.db.payment.invoice.update(criteria, {
      $set: {status},
      $push: {
        log: {
          status,
          comment,
          date_create: new Date(),
          creator: 'cs',
          operator_id,
        }
      }
    })
    .then(result => {
      if (!result.nMatched) {
        throw new ApiError(400, 'invalid invoice status');
      }
      return result;
    });
  }

  send({invoice_id, chip_info, operator_id}) {
    return this.db.payment.invoice.update({
      _id: invoice_id,
      status: C.INVOICE_STATUS.ISSUED
    }, {
      $set: {
        chip_info,
        status: C.INVOICE_STATUS.SHIPPED
      },
      $push: {
        log: {
          status: C.INVOICE_STATUS.SHIPPED,
          date_create: new Date(),
          creator: 'cs',
          operator_id,
        }
      }
    })
    .then(result => {
      if (!result.nMatched) {
        throw new ApiError(400, 'invalid invoice status');
      }
      return result;
    });
  }

  static isInvoiceNoLike(keyword) {
    return /^I?\d{4,21}/i.test(keyword);
  }

}
