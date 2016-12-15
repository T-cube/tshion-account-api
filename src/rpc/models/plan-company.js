import _ from 'underscore';
import { ObjectId } from 'mongodb';

import { mapObjectIdToData } from 'lib/utils';
import Model from './model';
import CompanyModel from './company';

const companyModel = new CompanyModel();

export default class PlanCompanyModel extends Model {

  constructor(props) {
    super(props);
  }

  fetchList(props) {
    let { page, pagesize, criteria } = props;
    return this.db.plan.company.find(criteria)
    .skip(page * pagesize)
    .limit(pagesize)
    .sort({
      _id: -1
    })
    .then(list => mapObjectIdToData(list, 'company', 'name,logo,description', 'company_id'))
    .then(list => {
      list.forEach(item => {
        item.company = item.company_id;
        item.company_id = item.company._id;
      });
      return list;
    });
  }

  count(criteria) {
    return this.db.plan.company.count(criteria);
  }

  fetchDetail(_id) {
    return this.db.plan.company.findOne({_id})
    .then(item => {
      let {company_id} = item;
      return companyModel.fetchDetail(company_id)
      .then(company => {
        item.company = company;
        return item;
      });
    });
  }

}
