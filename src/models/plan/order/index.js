import C from 'lib/constants';
import NewlyOrder from './newly';
import UpgradeOrder from './upgrade';
import DegradeOrder from './degrade';
import PatchOrder from './patch';
import RenewalOrder from './renewal';


export default class OrderFactory {

  static getInstance(order_type, props) {
    switch (order_type) {
    case C.ORDER_TYPE.NEWLY:
      return new NewlyOrder(props);
    case C.ORDER_TYPE.UPGRADE:
      return new UpgradeOrder(props);
    case C.ORDER_TYPE.DEGRADE:
      return new DegradeOrder(props);
    case C.ORDER_TYPE.PATCH:
      return new PatchOrder(props);
    case C.ORDER_TYPE.RENEWAL:
      return new RenewalOrder(props);
    default:
      return null;
    }
  }

}
