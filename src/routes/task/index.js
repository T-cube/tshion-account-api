import _ from 'underscore';
import express from 'express';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { oauthCheck } from 'lib/middleware';
import { fetchUserInfo, fetchCompanyMemberInfo } from 'lib/utils';
import { ENUMS } from 'lib/constants';

let api = express.Router();
export default api;

api.use(oauthCheck());

api.get('/', (req, res, next) => {
  let { keyword, sort, order, status, type, page, pagesize} = req.query;
  page = page || 1;
  pagesize = pagesize || 10;
  let condition = {};
  if (req.company) {
    condition.company_id = req.company._id;
  }
  if (_.contains(['assignee', 'creator', 'followers'], type)) {
    condition[type] = req.user._id;
  } else {
    condition['$or'] = ['assignee', 'creator', 'followers'].map(item => {
      return {
        [item]: req.user._id
      };
    });
  }
  if (status) {
    status = status.split(',').filter(s => _.contains(ENUMS.TASK_STATUS, s));
    if (status.length) {
      condition['status'] = { $in: status };
    }
  }
  if (keyword) {
    condition['$text'] = { $search: keyword };
  }
  let sortBy = { status: -1, date_update: 1 };
  if (_.contains(['date_create', 'date_update', 'priority'], sort)) {
    order = order == 'desc' ? -1 : 1;
    sortBy = { [sort]: order };
  }
  let data = {};
  Promise.all([
    db.task.count(condition)
    .then(sum => {
      data.totalrows = sum;
      data.page = page;
      data.pagesize = pagesize;
    }),
    db.task.find(condition, {
      followers: 0,
      description: 0,
    })
    .sort(sortBy)
    .skip((page - 1) * pagesize)
    .limit(pagesize)
    .then(list => {
      _.each(list, task => {
        task.is_following = !!_.find(task.followers, user_id => user_id
          && user_id.equals(req.user._id));
      });
      if (req.company) {
        return fetchCompanyMemberInfo(req.company.members, list, 'assignee');
      }
      return fetchUserInfo(list, 'assignee');
    })
    .then(list => data.list = list)
  ])
  .then(() => res.json(data))
  .catch(next);
});
