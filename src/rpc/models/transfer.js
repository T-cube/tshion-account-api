import Model from './model';
import C from 'lib/constants';
import RechargeOrder from 'models/plan/recharge-order';

export default class TransferModel extends Model {

  constructor(props) {
    super(props);
  }

  fetchList(props) {
    let { page, pagesize, criteria } = props;
    return this.db.transfer.find(criteria, {
      recharge_no: 1,
      company_name: 1,
      amount: 1,
      date_create: 1,
      status: 1,
    })
    .skip(page * pagesize)
    .limit(pagesize)
    .sort({
      date_update: -1,
    })
    .then(list => {
      return list;
    });
  }

  count(criteria) {
    return this.db.transfer.count(criteria);
  }

  detail(props) {
    let { transfer_id } = props;
    return this.db.transfer.findOne({
      _id: transfer_id
    })
    .then(doc => {
      return doc;
    });
  }

  confirm({transfer_id}) {
    return this.db.transfer.findOne({
      _id: transfer_id
    })
    .then(transfer => {
      return this.db.payment.charge.order.findOne({
        recharge_id: transfer.recharge_id
      })
      .then(charge => {
        let charge_id = charge._id;
        let recharge_id = transfer.recharge_id;
        return RechargeOrder.handlePaySuccess(recharge_id, charge_id)
        .then(() => {
          return this.db.transfer.findOneAndUpdate({
            _id: transfer_id
          }, {
            $set: {status: C.TRANSFER_STATUS.CONFIRMED},
            $push: { operation: {
              action: 'confirm',
              date_create: new Date(),
            }}
          }, {
            returnOriginal: false,
            returnNewDocument: true
          })
          .then(doc => {
            return doc.value;
          });
        });
      });
    });
  }

  reject({transfer_id}) {
    return this.db.transfer.findOne({
      _id: transfer_id
    })
    .then(transfer => {
      return Promise.all([
        this.db.transfer.findOneAndUpdate({
          _id: transfer_id
        }, {
          $set: {status: C.TRANSFER_STATUS.REJECTED},
          $push: { operation: {
            action: 'confirm',
            date_create: new Date(),
          }}
        }, {
          returnOriginal: false,
          returnNewDocument: true
        }),
        this.db.payment.charge.order.update({
          recharge_id: transfer.recharge_id
        }, {
          status: C.CHARGE_STATUS.CANCELLED
        }),
        this.db.payment.recharge.update({
          _id: transfer.recharge_id
        }, {
          status: C.CHARGE_STATUS.CANCELLED
        }),
      ])
      .then(([doc, order, recharge]) => {
        return doc.value;
      });
    });
  }

}
