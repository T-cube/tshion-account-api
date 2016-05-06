import _ from 'underscore';
import express from 'express';
import { oauthCheck } from 'lib/middleware';

import C, { ENUMS } from 'lib/constants';
let api = require('express').Router();
export default api;

api.get('/apply', (req, res, next) => {
  findItems(req, res, next, 'apply')
});

api.get('/copyto', (req, res, next) => {
  findItems(req, res, next, 'copy_to')
});

api.get('/approve', (req, res, next) => {
  let user_id = req.user._id;
  let company_id = req.company._id;
  db.approval.user.findOne({
    _id: user_id,
    'map.company_id': company_id
  }, {
    'map.$': 1
  })
  .then(mapData => {
    let flow_id = mapData ? mapData.map[0].flow_id : null;
    if (!mapData || !flow_id) {
      return res.json([]);
    }
    return db.approval.flow.findOne({
      _id: flow_id
    }, {
      approve: 1
    })
    .then(doc => {
      if (!doc || !doc.approve || !doc.approve.length) {
        return res.json([]);
      }
      let approve = doc.approve;
      let condition = req.query.status != 'processing' ? {
        _id: {
          $in: approve.map(item => item._id)
        }
      } : {
        $or: approve,
        status: C.APPROVAL_ITEM_STATUS.PROCESSING
      };
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
          let foundItem = _.find(approve, approveItem => approveItem._id.equals(item._id));
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
  })
  .catch(next);
});

function findItems(req, res, next, type) {
  let user_id = req.user._id;
  let company_id = req.company._id;
  db.approval.user.findOne({
    _id: user_id,
    'map.company_id': company_id
  }, {
    'map.$': 1
  })
  .then(mapData => {
    let flow_id = mapData ? mapData.map[0].flow_id : null;
    if (!mapData || !flow_id) {
      return res.json([]);
    }
    return db.approval.flow.findOne({
      _id: flow_id
    }, {
      [type]: 1
    })
    .then(doc => {
      if (!doc || !doc[type] || !doc[type].length) {
        return res.json([]);
      }
      let condition = {
        _id: {
          $in: doc[type]
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
      .then(data => res.json(data || []))
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
