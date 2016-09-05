import _ from 'underscore';
import express from 'express';
import Promise from 'bluebird';

import db from 'lib/database';
import C from 'lib/constants';
import { generateToken } from 'lib/utils';
import ApprovalFlow from 'models/approval-flow';

let api = express.Router();
export default api;

api.get(/^\/(apply|copyto|approve)$/, findItems);

function findItems(req, res, next) {
  new ApprovalFlow({
    company: req.company,
    user_id: req.user._id,
    type: req.params[0],
    query: req.query,
  })
  .findItems()
  .then(data => res.json(data))
  .catch(next);
}

api.get(/^\/(apply|copyto|approve)\/token$/, (req, res, next) => {
  return generateToken(48).then(token => {
    db.approval.export.insert({
      token: token,
      user: req.user._id,
      company: req.company._id,
      type: req.params[0],
      query: _.pick(req.query, 'page', 'pagesize', 'status', 'template', 'export_count'),
    });
    res.json({ token });
  })
  .catch(next);
});

api.get('/count', (req, res, next) => {
  ApprovalFlow
  .getFlowByType(req.company._id, req.user._id)
  .then(flow => {
    if (!flow) {
      return {
        apply_processing: 0,
        copyto_processing: 0,
        approve_processing: 0,
        apply_resolved: 0,
        copyto_resolved: 0,
        approve_resolved: 0,
      };
    }
    let apply = flow.apply || [];
    let copyto = flow.copyto || [];
    let approve = flow.approve || [];
    let conditions = {
      apply_processing: {_id: {$in: apply}, status: C.APPROVAL_ITEM_STATUS.PROCESSING},
      // apply_resolved: {_id: {$in: apply}, status: {$ne: C.APPROVAL_ITEM_STATUS.PROCESSING}},
      copyto_processing: {_id: {$in: copyto}, status: C.APPROVAL_ITEM_STATUS.PROCESSING},
      // copyto_resolved: {_id: {$in: copyto}, status: {$ne: C.APPROVAL_ITEM_STATUS.PROCESSING}},
      approve_processing: {_id: { $in: approve.map(i => i._id)}, step: {$in: approve.map(i => i.step)}, status: C.APPROVAL_ITEM_STATUS.PROCESSING},
      // approve_resolved: {_id: { $in: approve.map(i => i._id)}, $or: [{step: {$nin: approve.map(i => i.step)}}, {status: {$ne: C.APPROVAL_ITEM_STATUS.PROCESSING}}]},
    };
    return Promise.map(_.values(conditions), condition => db.approval.item.count(condition))
    .then(data => {
      data = _.object(_.keys(conditions), data);
      return _.extend(data, {
        apply_resolved: apply.length - data.apply_processing,
        copyto_resolved: copyto.length - data.copyto_processing,
        approve_resolved: approve.length - data.approve_processing,
      });
    });
  })
  .then(data => res.json(data))
  .catch(next);
});
