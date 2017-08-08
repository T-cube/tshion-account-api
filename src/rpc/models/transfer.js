import Model from './model';
import C from 'lib/constants';
import RechargeOrder from 'models/plan/recharge-order';

export default class TransferModel extends Model {

  constructor(props) {
    super(props);
  }

  fetchList(props) {
    let { page, pagesize, criteria } = props;
    return this.db.transfer.find(criteria)
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

  confirm(transfer_id) {
    return Promise.all([
      this.db.transfer.update({
        _id: transfer_id
      }, {
        status: C.TRANSFER_STATUS.CONFIRMED
      }),
      this.db.transfer.findOne({
        _id: transfer_id
      }),
    ])
    .then(([updated, transfer]) => {
      return this.db.payment.charge.order.findOne({
        recharge_id: transfer.recharge_id
      })
      .then(charge => {
        let charge_id = charge._id;
        let recharge_id = transfer.recharge_id;
        return RechargeOrder.handlePaySuccess(recharge_id, charge_id);
      });
    });
  }

  reject(transfer_id) {
    return this.db.transfer.findOne({
      _id: transfer_id
    })
    .then(transfer => {
      return Promise.all([
        this.db.transfer.update({
          _id: transfer_id
        }, {
          status: C.TRANSFER_STATUS.REJECTED
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
      ]);
    });
  }

}
