import _ from 'underscore';
import express from 'express';
import { oauthCheck } from 'lib/middleware';

import C, { ENUMS } from 'lib/constants';
let api = require('express').Router();
export default api;

api.get('/apply', (req, res, next) => {
  let condition = {
    from: req.user._id,
    company_id: req.company._id,
  };
  _.extend(condition, getQueryCondition(req.query));
  db.approval.item.find(condition)
  .then(data => {
    res.json(data || []);
  })
});

api.get('/apply/count', (req, res, next) => {
  let condition = {
    from: req.user._id,
    company_id: req.company._id,
  };
  _.extend(condition, getQueryCondition(req.query));
  db.approval.item.aggregate([{
    $match: condition
  }, {
    $group: {
      _id: '$status',
      count: {
        $sum: 1
      }
    }
  }])
  .then(doc => res.json(doc))
});

api.get('/copyto/count', (req, res, next) => {
  getCount(req, res, next, 'approve');
});

api.get('/approve/count', (req, res, next) => {
  getCount(req, res, next, 'approve');
});

api.get('/copyto', (req, res, next) => {
  findItems(req, res, next, 'copyto');
});

api.get('/approve', (req, res, next) => {
  findItems(req, res, next, 'approve');
});

function getCount(req, res, next, type) {
  return db.approval[type].find({
    user: req.user._id,
    company: req.company._id
  })
  .then(itemList => {
    if (!itemList.length) {
      return res.json({});
    }
    let condition = {
      _id: {
        $in: itemList.map(item => item.item)
      }
    };
    _.extend(condition, getQueryCondition(req.query));
    return db.approval.item.aggregate([{
      $match: condition
    }, {
      $group: {
        _id: '$status',
        count: {
          $sum: 1
        }
      }
    }])
    .then(doc => res.json(doc))
  })
  .catch(next)
}

function findItems(req, res, next, type) {
  return db.approval[type].find({
    user: req.user._id,
    company: req.company._id
  })
  .then(itemList => {
    if (!itemList.length) {
      return res.json([]);
    }
    let condition = {
      _id: {
        $in: itemList.map(item => item.item)
      }
    };
    _.extend(condition, getQueryCondition(req.query));
    return db.approval.item.find(condition, {
      from: 1,
      department: 1,
      template_id: 1,
      create_time: 1,
      status: 1,
      content: 1,
      log: 1,
      step: 1,
      steps: 1,
    })
    .then(data => {
      data = data.map(item => {
        let foundItem = _.find(itemList, each => each.item.equals(item._id));
        if (foundItem
          && item.status == C.APPROVAL_ITEM_STATUS.PROCESSING
          && foundItem.step
          && foundItem.step.equals(item.step)) {
          item.is_processing = true;
        } else {
          item.is_processing = false;
        }
        return item;
      });
      res.json(data || []);
    })
  })
  .catch(next);
}

function getQueryCondition(query) {
  if (query.status && -1 != _.indexOf(ENUMS.APPROVAL_ITEM_STATUS, query.status)) {
    return {
      status: query.status
    }
  }
  return null;
}
