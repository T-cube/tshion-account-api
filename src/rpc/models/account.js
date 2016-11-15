import { mapObjectIdToData } from 'lib/utils';
import Model from './model';

export default class CompanyModel extends Model {

  constructor() {
    super();
  }

  page(props) {
    let { page, pagesize, criteria } = props;
    return Promise.all([
      this.count(criteria),
      this.fetchList(props)
    ])
    .then(doc => {
      let [totalRows, list] = doc;
      return {
        list,
        page,
        pagesize,
        totalRows
      };
    });
  }

  fetchList(props) {
    let { page, pagesize, criteria } = props;
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
    })
    .skip(page * pagesize)
    .limit(pagesize);
  }

  count(criteria) {
    return this.db.user.count(criteria);
  }

  fetchDetail(_id) {
    return this.db.user.findOne({_id}, {
      name: 1,
      email: 1,
      email_verified: 1,
      mobile: 1,
      mobile_verified: 1,
      description: 1,
      avatar: 1,
      birthdate: 1,
      address: 1,
      sex: 1,
    });
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
      return mapObjectIdToData(projects, 'project', 'name,logo,is_archived,company')
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
      return mapObjectIdToData(companies, 'company', 'name,logo')
      .then(list => ({
        list: list.filter(i => i),
        page,
        pagesize,
        totalRows
      }));
    });
  }

}
