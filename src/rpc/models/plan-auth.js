import _ from 'underscore';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import C from 'lib/constants';
import { mapObjectIdToData } from 'lib/utils';
import Model from './model';

export default class PlanAuthModel extends Model {

  constructor(props) {
    super(props);
  }

  fetchList(props) {
    let { page, pagesize, criteria } = props;
    return this.db.plan.auth.find(criteria, {
      data: 0,
      log: 0
    })
    .skip(page * pagesize)
    .limit(pagesize)
    .then(doc => mapObjectIdToData(doc, [
      ['company', 'name,logo', 'company_id'],
      ['user', 'name,avatar', 'user_id'],
    ]))
    .then(doc => {
      doc.forEach(info => {
        info.user = info.user_id;
        info.company = info.company_id;
        delete info.user_id;
        delete info.company_id;
      });
      return doc;
    });
  }

  count(criteria) {
    return this.db.plan.auth.count(criteria);
  }

  fetchDetail(_id) {
    return this.db.plan.auth.findOne({_id})
    .then(doc => mapObjectIdToData(doc, [
      ['company', 'name,logo', 'company_id'],
      ['user', 'name,avatar', 'user_id'],
      ['user.realname', '', 'data.info.contact'],
    ]))
    .then(doc => {
      if (!doc) {
        return null;
      }
      doc.user = doc.user_id;
      doc.company = doc.company_id;
      delete doc.user_id;
      delete doc.company_id;
      let info = doc.nearest_data = doc.data.pop();
      doc.history_data = doc.data;
      delete doc.data;
      const qiniu = this.model('qiniu').bucket('cdn-private');
      if (info.enterprise && info.enterprise.certificate_pic) {
        return Promise.map(info.enterprise.certificate_pic, file => {
          return qiniu.makeLink(file);
        })
        .then(pics => {
          info.enterprise.certificate_pic = pics;
          return doc;
        });
      } else if (info.contact && info.contact.realname_ext) {
        return Promise.map(info.contact.realname_ext.idcard_photo, file => {
          return qiniu.makeLink(file);
        })
        .then(pics => {
          info.contact.realname_ext.idcard_photo = pics;
          return doc;
        });
      }
      return doc;
    });
  }

  audit({auth_id, status, comment, operator_id}) {
    let update = {
      $set: {
        status,
        'data.$.status': status
      },
      $push: {
        log: {
          _id: ObjectId(),
          status,
          comment,
          operator_id,
          creator: 'cs',
          date_create: new Date()
        }
      }
    };
    if (status == C.AUTH_STATUS.ACCEPTED) {
      return this.db.plan.auth.findAndModify({
        query: {
          _id: auth_id,
          'data.status': {
            $in: [C.AUTH_STATUS.POSTED, C.AUTH_STATUS.REPOSTED]
          }
        },
        update,
      })
      .then(doc => {
        if (doc.value) {
          let { company_id } = doc.value;
          return Promise.all([
            this.db.plan.company.update({
              _id: company_id
            }, {
              $set: {
                certified: {
                  plan: doc.value.plan,
                  date: new Date()
                }
              }
            }),
            this.db.plan.auth.update({
              company_id,
              _id: {$ne: auth_id},
              status: {
                $in: [C.AUTH_STATUS.REJECTED, C.AUTH_STATUS.ACCEPTED]
              }
            }, {
              $set: {
                status: C.AUTH_STATUS.EXPIRED
              }
            }, {
              multi: true
            })
          ]);
        }
      });
    }
    return this.db.plan.auth.update({
      _id: auth_id
    }, update);
  }

}
