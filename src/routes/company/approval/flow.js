import _ from 'underscore';
import express from 'express';

import db from 'lib/database';
import C, { ENUMS } from 'lib/constants';
import { mapObjectIdToData, fetchCompanyMemberInfo } from 'lib/utils';
import Structure from 'models/structure';
let api = express.Router();
export default api;

const fetchItemFields = {
  from: 1,
  department: 1,
  template: 1,
  apply_date: 1,
  status: 1,
  content: 1,
  log: 1,
  step: 1,
  steps: 1,
};

api.get('/apply', (req, res, next) => {
  findItems(req, res, next, 'apply');
});

api.get('/copyto', (req, res, next) => {
  findItems(req, res, next, 'copy_to');
});

api.get('/approve', (req, res, next) => {
  getFlowByType(req, 'approve')
  .then(flow => {
    let approve = flow && flow.approve;
    if (!flow || !approve || !approve.length) {
      return res.json([]);
    }
    let condition = req.query.status != 'processing' ? {
      _id: {
        $in: approve.map(item => item._id)
      }
    } : {
      $or: approve,
      status: C.APPROVAL_ITEM_STATUS.PROCESSING
    };
    return db.approval.item.find(condition, fetchItemFields)
    .sort({_id: -1})
    .then(data => {
      return Promise.all([
        mapObjectIdToData(data, 'approval.template', 'name,status', 'template'),
        fetchCompanyMemberInfo(req.company.members, data, 'from')
      ])
      .then(() => data);
    })
    .then(data => {
      let tree = new Structure(req.company.structure);
      data.forEach(item => {
        item.department && (item.department = tree.findNodeById(item.department));
        let foundItemCurStep = _.find(
          approve,
          approveItem =>
            approveItem._id && approveItem._id.equals(item._id) && approveItem.step && approveItem.step.equals(item.step)
          );
        if (foundItemCurStep && item.status == C.APPROVAL_ITEM_STATUS.PROCESSING) {
          item.is_processing = true;
        } else {
          item.is_processing = false;
        }
      });
      res.json(data);
    });
  })
  .catch(next);
});

function findItems(req, res, next, type) {
  getFlowByType(req, type)
  .then(flow => {
    if (!flow || !flow[type] || !flow[type].length) {
      return res.json([]);
    }
    let condition = {
      _id: {
        $in: flow[type]
      }
    };
    _.extend(condition, getQueryCondition(req.query));
    return db.approval.item.find(condition, fetchItemFields).sort({_id: -1})
    .then(data => {
      return Promise.all([
        mapObjectIdToData(data, 'approval.template', 'name,status', 'template'),
        fetchCompanyMemberInfo(req.company.members, data, 'from')
      ])
      .then(() => data);
    })
    .then(data => {
      let tree = new Structure(req.company.structure);
      data.forEach(item => {
        item.department && (item.department = tree.findNodeById(item.department));
      });
      res.json(data);
    });
  })
  .catch(next);
}

function getFlowByType(req, type) {
  let user_id = req.user._id;
  let company_id = req.company._id;
  return db.approval.user.findOne({
    _id: user_id,
    'map.company_id': company_id
  }, {
    'map.$': 1
  })
  .then(mapData => {
    let flow_id = mapData && mapData.map[0].flow_id;
    if (!mapData || !flow_id) {
      return null;
    }
    return db.approval.flow.findOne({
      _id: flow_id
    }, {
      [type]: 1
    });
  });
}

function getQueryCondition(query) {
  if (query.status && -1 != _.indexOf(ENUMS.APPROVAL_ITEM_STATUS, query.status)) {
    return {
      status: query.status
    };
  }
  return null;
}
