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

  fetchDetail(_id) {
    return this.db.company.findOne({_id}, {
      structure: 0
    })
    .then(company => {
      if (company) {
        company.member_count = company.members.length;
        company.project_count = company.projects ? company.projects.length : 0;
        delete company.members;
        delete company.projects;
      }
      return company;
    });
  }

  fetchMemberList(props) {
    let { _id, page, pagesize } = props;
    return this.db.company.findOne({_id}, {
      members: 1
    })
    .then(company => {
      if (!company) {
        return null;
      }
      let totalRows = company.members.length;
      return {
        list: company.members.slice(page * pagesize, (page + 1) * pagesize),
        page,
        pagesize,
        totalRows
      };
    });
  }

  fetchProjectList(props) {
    let { _id, page, pagesize } = props;
    return this.db.company.findOne({_id}, {
      projects: 1
    })
    .then(doc => {
      if (!doc) {
        return null;
      }
      let projects = doc.projects || [];
      let totalRows = projects.length;
      projects = projects.slice(page * pagesize, (page + 1) * pagesize);
      return mapObjectIdToData(projects, 'project', 'name,logo,is_archived,date_create')
      .then(list => ({
        list: list.filter(i => i),
        page,
        pagesize,
        totalRows
      }));
    });
  }

}
