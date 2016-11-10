import { mapObjectIdToData } from 'lib/utils';
import Model from './model';

export default class CompanyModel extends Model {

  constructor() {
    super();
  }

  fetchList(criteria, query) {
    let { page, pagesize } = this.getPageInfo(query);
    return this.db.company.aggregate([
      { $match: criteria },
      {
        $project: {
          name: 1,
          description: 1,
          owner: 1,
          logo: 1,
          date_create: 1,
          member_count: {$size: '$members'},
          project_count: {$size: '$projects'},
        }
      },
      { $skip: page * pagesize },
      { $limit: pagesize }
    ]);
  }

  count(criteria) {
    return this.db.company.count(criteria);
  }

  fetchDetail(companyId) {
    return this.db.company.findOne({
      _id: companyId
    }, {
      structure: 0
    })
    .then(company => {
      return company && mapObjectIdToData(company, 'project', 'name,logo,is_archived', 'projects');
    });
  }

}
