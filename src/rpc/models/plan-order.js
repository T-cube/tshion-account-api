import { mapObjectIdToData, strToReg } from 'lib/utils';
import Model from './model';

export default class PlanOrderModel extends Model {

  constructor(props) {
    super(props);
  }

  fetchList({criteria, page, pagesize}) {
    return this.db.payment.order.find(criteria, {
      products: 0,
      discount: 0,
      transactions: 0,
    })
    .skip(page * pagesize)
    .limit(pagesize)
    .sort({_id:-1})
    .then(doc => {
      doc.forEach(item => {
        item.company = item.company_id;
        delete item.company_id;
        item.user = item.user_id;
        delete item.user_id;
      });
      return mapObjectIdToData(doc, [
        ['company', 'name,logo', 'company'],
        ['user', 'name,avatar', 'user'],
      ]);
    });
  }

  count(criteria) {
    return this.db.payment.order.count(criteria);
  }

  fetchDetail(_id) {
    return this.db.payment.order.findOne({_id})
    .then(doc => {
      doc.company = doc.company_id;
      doc.user = doc.user_id;
      delete doc.company_id;
      delete doc.user_id;
      return mapObjectIdToData(doc, [
        ['company', 'name,logo', 'company'],
        ['user', 'name,avatar', 'user'],
      ]);
    });
  }

  pageByCompanyName({company_name, page, pagesize, criteria}) {
    return this.db.company.find({
      name: {
        $regex: strToReg(company_name, 'i')
      }
    }, {
      _id: 1
    })
    .then(doc => {
      if (!doc.length) {
        return {
          page,
          pagesize,
          totalrows: 0,
          list: []
        };
      }
      let companyIdList = doc.map(i => i._id);
      criteria.company_id = {
        $in: companyIdList
      };
      return this.page({page, pagesize, criteria});
    });
  }

  static isOrderNoLike(keyword) {
    return /^T?\d{4,21}/i.test(keyword);
  }

  static isCompanyNameLike(keyword) {
    return !!keyword;
  }

}
