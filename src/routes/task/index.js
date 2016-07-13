import _ from 'underscore';
import express from 'express';
import config from 'config';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { oauthCheck } from 'lib/middleware';
import { fetchUserInfo, fetchCompanyMemberInfo, uniqObjectId } from 'lib/utils';
import { ENUMS } from 'lib/constants';

let api = express.Router();
export default api;

api.use(oauthCheck());

api.get('/', (req, res, next) => {
  let { keyword, sort, order, status, type, page, pagesize} = req.query;
  page = parseInt(page) || 1;
  pagesize = parseInt(pagesize);
  pagesize = (pagesize <= config.get('view.maxListNum') && pagesize > 0)
    ? pagesize
    : config.get('view.taskListNum');
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
    condition['title'] = {
      $regex: RegExp(keyword, 'i')
    };
  }
  let sortBy = { status: -1, date_update: -1 };
  if (_.contains(['date_create', 'date_update', 'priority'], sort)) {
    order = order == 'desc' ? -1 : 1;
    sortBy = { [sort]: order };
  }
  let data = {}, projects = [];
  Promise.all([
    db.task.count(condition)
    .then(sum => {
      data.totalrows = sum;
      data.page = page;
      data.pagesize = pagesize;
    }),
    db.task.find(condition, {
      description: 0,
    })
    .sort(sortBy)
    .skip((page - 1) * pagesize)
    .limit(pagesize)
    .then(list => {
      _.each(list, task => {
        projects.push(task.project_id);
        task.is_following = !!_.find(task.followers, user_id => user_id
          && user_id.equals(req.user._id));
        delete task.followers;
      });
      projects = uniqObjectId(projects);
      if (req.company) {
        return fetchCompanyMemberInfo(req.company.members, list, 'assignee');
      }
      return fetchUserInfo(list, 'assignee');
    })
    .then(list => {
      return db.project.find({
        _id: {
          $in: projects
        }
      }, {
        tags: 1
      })
      .then(projects => {
        let tags = _.flatten(projects.map(project => project.tags));
        list.forEach(task => {
          task.tags = task.tags && task.tags.map(_id => _.find(tags, tag => tag._id.equals(_id)));
        });
        return list;
      });
    })
    .then(list => data.list = list)
  ])
  .then(() => res.json(data))
  .catch(next);
});
