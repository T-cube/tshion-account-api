import { mapObjectIdToData } from 'lib/utils';
import Model from './model';

export default class RehargeModel extends Model {

  constructor(props) {
    super(props);
  }

  fetchList({page, pagesize, criteria}) {
    return this.db.payment.recharge.find(criteria, {
      products: 0,
      discount: 0,
      transactions: 0,
    })
    .skip(page * pagesize)
    .limit(pagesize)
    .then(doc => {
      doc.forEach(item => {
        item.company = item.company_id;
        item.user = item.user_id;
      });
      return mapObjectIdToData(doc, [
        ['company', 'name,logo', 'company'],
        ['user', 'name,avatar', 'user'],
      ]);
    });
  }

  count(criteria) {
    return this.db.payment.recharge.count(criteria);
  }

  fetchDetail(_id) {
    return this.db.payment.recharge.findOne({_id})
    .then(doc => {
      doc.company = doc.company_id;
      doc.user = doc.user_id;
      return mapObjectIdToData(doc, [
        ['company', 'name,logo', 'company'],
        ['user', 'name,avatar', 'user'],
      ]);
    });
  }

  static isRechargeNoLike(keyword) {
    return /^R?\d{4,21}/i.test(keyword);
  }

}
