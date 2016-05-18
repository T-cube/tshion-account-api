import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import { ApiError } from 'lib/error';
import { oauthCheck, authCheck } from 'lib/middleware';
import { mapObjectIdToData, fetchUserInfo } from 'lib/utils';

let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.get('/', (req, res, next) => {
  let { keyword, sort, order, status, assignee, creator, follower} = req.query;
  let condition = {};
  if (req.company) {
    condition.company_id = req.company._id;
  }
  let idItems = _.pick(req.query, 'assignee', 'creator', 'followers');
  let type = req.query.type;
  if (_.contains(['assignee', 'creator', 'followers'], type)) {
    condition[type] = req.user._id;
  } else {
    condition['$or'] = ['assignee', 'creator', 'followers'].map(item => {
      return {
        [item]: req.user._id
      }
    })
  }
  if (status) {
    status = status.split(',').filter(s => _.contains(ENUMS.TASK_STATUS, s));
    if (status.length) {
      condition['status'] = { $in: status };
    }
  }
  if (keyword) {
    condition['$text'] = { $search: keyword }
  }
  let sortBy = { status: -1, date_update: 1 };
  if (_.contains(['date_create', 'date_update', 'priority'], sort)) {
    order = order == 'desc' ? -1 : 1;
    sortBy = { [sort]: order }
  }
  db.task.find(condition).sort(sortBy)
  .then(list => {
    _.each(list, task => {
      task.is_following = !!_.find(task.followers, user_id => user_id
        && user_id.equals(req.user._id));
    });
    return list
  })
  .then(list => {
    // return Promise.all([
    //   mapObjectIdToData(list, [
    //     ['company', 'name', 'company_id'],
    //     ['project', 'name,tags', 'project_id'],
    //   ]),
    //   fetchUserInfo(list, 'assignee', 'creator')
    // ])
    // .then(() => {
    //   list.forEach(task => {
    //     task.tags = task.tags ? task.tags.map(tag_id => {
    //       return _.find(task.project_id.tags, project_tag => project_tag._id && project_tag._id.equals(tag_id))
    //     }) : [];
    //     delete task.project_id.tags;
    //   })
      return res.json(list)
    // })
  })
  .catch(next);
})
