import _ from 'underscore';
import express from 'express';
import config from 'config';
import { ObjectId } from 'mongodb';

import db from 'lib/database';
import { oauthCheck } from 'lib/middleware';
import { fetchUserInfo, fetchCompanyMemberInfo, uniqObjectId } from 'lib/utils';
import C, { ENUMS } from 'lib/constants';

let api = express.Router();
export default api;

api.use(oauthCheck());

api.get('/', (req, res, next) => {
  let { keyword, sort, order, status, type, page, pagesize, is_expired, p_id, is_loop } = req.query;
  page = parseInt(page) || 1;
  pagesize = parseInt(pagesize);
  pagesize = (pagesize <= config.get('view.maxListNum') && pagesize > 0)
    ? pagesize
    : config.get('view.taskListNum');
  let condition = {
    project_archived: {
      $ne: true
    },
  };
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
  if (is_expired === '1') {
    condition['status'] = C.TASK_STATUS.PROCESSING;
    condition['date_due'] = {
      $lt: new Date()
    };
  } else if (is_expired === '0') {
    condition['$or'] = [{
      date_due: {
        $gte: new Date()
      }
    }, {
      status: C.TASK_STATUS.COMPLETED
    }];
  }
  if (p_id) {
    condition['p_id'] = ObjectId(p_id);
  } else if (is_loop) {
    condition['$and'] = [{
      loop: {
        $exists: true
      },
      'loop.type': {
        $ne: null
      }
    }];
  }
  let sortBy = { status: -1, date_update: -1 };
  if (_.contains(['date_create', 'date_update', 'priority'], sort)) {
    order = order == 'desc' ? -1 : 1;
    sortBy = { [sort]: order };
  }
  let data = {}, projects = [];
  db.user.findOne({
    _id: req.user._id
  }, {
    projects: 1
  })
  .then(user => {
    if (user.projects && user.projects.length) {
      condition.project_id = {
        $in: user.projects
      };
    }
    return Promise.all([
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
          return fetchCompanyMemberInfo(req.company, list, 'assignee');
        }
        return fetchUserInfo(list, 'assignee');
      })
      // .then(list => {
      //   return db.project.find({
      //     _id: {
      //       $in: projects
      //     }
      //   }, {
      //     tags: 1
      //   })
      //   .then(projects => {
      //     let tags = _.flatten(projects.map(project => project.tags));
      //     list.forEach(task => {
      //       task.tags = task.tags && task.tags.map(_id => _.find(tags, tag => tag._id.equals(_id)));
      //     });
      //     return list;
      //   });
      // })
      .then(list => data.list = list)
    ]);
  })
  .then(() => res.json(data))
  .catch(next);
});
