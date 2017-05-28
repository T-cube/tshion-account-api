import C from 'lib/constants';

import Plan from '../plan';
import NewlyOrder from './newly';
import UpgradeOrder from './upgrade';
import DegradeOrder from './degrade';
import RenewalOrder from './renewal';


export default class OrderFactory {

  static getInstance(props) {
    let {
      company_id,
      user_id,
      plan,
      member_count,
      serial_no,
      times,
      order_type,
    } = props;
    return new Plan(company_id).getStatus().then(planStatus => {
      let props = {
        company_id,
        user_id,
        planStatus
      };
      let orderModel;
      switch (order_type) {
        case C.ORDER_TYPE.NEWLY:
          orderModel = new NewlyOrder(props);
          break;
        case C.ORDER_TYPE.UPGRADE:
          orderModel = new UpgradeOrder(props);
          break;
        case C.ORDER_TYPE.DEGRADE:
          orderModel = new DegradeOrder(props);
          break;
        case C.ORDER_TYPE.RENEWAL:
          orderModel = new RenewalOrder(props);
          break;
        default:
          throw new Error('invalid_order_type');
      }
      return orderModel.init({plan, member_count, serial_no, times})
      .then(() => {
        return {
          prepare: orderModel.prepare.bind(orderModel),
          save: orderModel.save.bind(orderModel),
          getCoupons: orderModel.getCoupons.bind(orderModel),
        };
      });
    });
  }

}
