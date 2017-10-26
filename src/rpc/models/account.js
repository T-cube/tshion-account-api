import _ from 'underscore';
import { mapObjectIdToData } from 'lib/utils';
import Model from './model';
import Promise from 'bluebird';

export default class CompanyModel extends Model {

  constructor() {
    super();
  }

  fetchList(props) {
    let { page, pagesize, criteria } = props;
    console.dir(criteria);
    return this.db.user.find(criteria, {
      name: 1,
      email: 1,
      email_verified: 1,
      mobile: 1,
      mobile_verified: 1,
      description: 1,
      avatar: 1,
      birthdate: 1,
      sex: 1,
      last_login:1
    })
    .skip(page * pagesize)
    .limit(pagesize)
    .sort({
      _id: -1,
    });
  }

  count(criteria) {
    return this.db.user.count(criteria);
  }

  fetchDetail(_id) {
    return this.db.user.findOne({_id});
  }

  fetchProjectList(props) {
    let { _id, page, pagesize } = props;
    return this.db.user.findOne({_id}, {
      projects: 1
    })
    .then(doc => {
      if (!doc) {
        return null;
      }
      let projects = doc.projects || [];
      let totalRows = projects.length;
      projects = projects.slice(page * pagesize, (page + 1) * pagesize);
      return mapObjectIdToData(projects, 'project', 'name,logo,is_archived,company,date_create')
      .then(list => ({
        list: list.filter(i => i),
        page,
        pagesize,
        totalRows
      }));
    });
  }

  fetchCompanyList(props) {
    let { _id, page, pagesize } = props;
    return this.db.user.findOne({_id}, {
      companies: 1
    })
    .then(doc => {
      if (!doc) {
        return null;
      }
      let companies = doc.companies || [];
      let totalRows = companies.length;
      companies = companies.slice(page * pagesize, (page + 1) * pagesize);
      return this.db.company.find({
        _id: {$in: companies},
        'members._id': _id
      }, {
        name: 1,
        description: 1,
        logo: 1,
        'members.$': 1
      })
      .then(list => {
        list.filter(i => i).map(i => {
          i.member_type = i.members.length ? i.members[0].type : null;
          i.member_count = i.members.length;
          delete i.members;
          return i;
        });
        return Promise.map(list, item => {
          return this.db.plan.company.findOne({
            _id: item._id
          })
          .then(doc => {
            item.plan = doc;
            return item;
          });
        })
        .then(company_list => {
          return {
            list: company_list,
            page,
            pagesize,
            totalRows,
          };
        });
      });
    });
  }

}
