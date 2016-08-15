import _ from 'underscore';
import express from 'express';
import config from 'config';
import Promise from 'bluebird';
import { ObjectId } from 'mongodb';
import moment from 'moment';

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

api.use((req, res, next) => {
  if (req.query.download) {
    req.fetchItemFields = _.extend({}, fetchItemFields, {
      forms: 1
    });
    req.forDownload = true;
  } else {
    req.fetchItemFields = fetchItemFields;
  }
  next();
});

api.get('/apply', (req, res, next) => {
  findItems(req, res, next, 'apply');
});

api.get('/copyto', (req, res, next) => {
  findItems(req, res, next, 'copy_to');
});

api.get('/approve', (req, res, next) => {
  let pageInfo = getPageInfo(req);
  let { page, pagesize } = pageInfo;
  getFlowByType(req, 'approve')
  .then(flow => {
    let approve = flow && flow.approve;
    if (!flow || !approve || !approve.length) {
      return res.json(getEmptyData(pagesize, req.forDownload));
    }
    let condition = {
      _id: {
        $in: approve.map(item => item._id)
      }
    };
    let { status, export_count, template } = req.query;
    if (status == 'processing') {
      condition.step = {
        $in: approve.map(item => item.step)
      };
      condition.status = C.APPROVAL_ITEM_STATUS.PROCESSING;
    } else if (status == 'resolved') {
      condition.step = {
        $nin: approve.map(item => item.step)
      };
    }
    if (template) {
      condition.template = ObjectId(template);
    }
    let data = {};
    let counting = null;
    let listing = null;
    if (!req.forDownload) {
      counting = db.approval.item.count(condition)
      .then(sum => {
        data.totalrows = sum;
        data.page = page;
        data.pagesize = pagesize;
      });
    }
    if (!req.forDownload || !export_count || export_count == 'page') {
      listing = db.approval.item.find(condition, req.fetchItemFields)
      .sort({_id: -1})
      .skip((page - 1) * pagesize)
      .limit(pagesize);
    } else {
      let apply_date;
      if (export_count == 'this_month') {
        apply_date = {
          $gte: moment().date(1).minute(0).toDate(),
          $lt: new Date(),
        };
      } else if (export_count == 'last_month') {
        apply_date = {
          $gte: moment().month(-1).date(1).minute(0).toDate(),
          $lt: moment().date(1).minute(0).toDate(),
        };
      }
      if (export_count != 'all') {
        condition.apply_date = apply_date;
      }
      listing = db.approval.item.find(condition, req.fetchItemFields);
    }
    return Promise.all([
      counting,
      listing.then(list => {
        return Promise.all([
          mapObjectIdToData(list, 'approval.template', 'name,status,forms.label', 'template'),
          fetchCompanyMemberInfo(req.company.members, list, 'from')
        ])
        .then(() => list);
      })
      .then(list => {
        let tree = new Structure(req.company.structure);
        list.forEach(item => {
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
        data.list = list;
      })
    ])
    .then(() => res.json(wrapResponseData(data, req.forDownload)));
  })
  .catch(next);
});

api.get('/count', (req, res, next) => {
  getFlowByType(req)
  .then(flow => {
    if (!flow) {
      return res.json({
        apply_processing: 0,
        copyto_processing: 0,
        approve_processing: 0,
        apply_resolved: 0,
        copyto_resolved: 0,
        approve_resolved: 0,
      });
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

function findItems(req, res, next, type) {
  let pageInfo = getPageInfo(req);
  let { page, pagesize } = pageInfo;
  getFlowByType(req, type)
  .then(flow => {
    if (!flow || !flow[type] || !flow[type].length) {
      return res.json(getEmptyData(pagesize, req.forDownload));
    }
    let condition = {
      _id: {
        $in: flow[type]
      }
    };
    _.extend(condition, getQueryCondition(req.query));
    let data = {};
    return Promise.all([
      db.approval.item.count(condition)
      .then(sum => {
        data.totalrows = sum;
        data.page = page;
        data.pagesize = pagesize;
      }),
      db.approval.item.find(condition, req.fetchItemFields)
      .sort({_id: -1})
      .skip((page - 1) * pagesize)
      .limit(pagesize)
      .then(list => {
        return Promise.all([
          mapObjectIdToData(list, 'approval.template', 'name,status,forms.label', 'template'),
          fetchCompanyMemberInfo(req.company.members, list, 'from')
        ])
        .then(() => list);
      })
      .then(list => {
        let tree = new Structure(req.company.structure);
        list.forEach(item => {
          item.department && (item.department = tree.findNodeById(item.department));
        });
        data.list = list;
      })
    ])
    .then(() => res.json(wrapResponseData(data, req.forDownload)));
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
    if (type) {
      return db.approval.flow.findOne({
        _id: flow_id
      }, {
        [type]: 1
      });
    }
    return db.approval.flow.findOne({
      _id: flow_id
    });
  });
}

function getQueryCondition(query) {
  let { status, template } = query;
  let condition = {};
  if (status == 'processing') {
    condition.status = C.APPROVAL_ITEM_STATUS.PROCESSING;
  }
  if (status == 'resolved') {
    condition.status = {
      $ne: C.APPROVAL_ITEM_STATUS.PROCESSING
    };
  }
  if (template) {
    condition.template = ObjectId(template);
  }
  return condition;
}

function getPageInfo(req) {
  let { page, pagesize } = req.query;
  page = parseInt(page) || 1;
  pagesize = parseInt(pagesize);
  pagesize = (pagesize <= config.get('view.maxListNum') && pagesize > 0)
    ? pagesize
    : config.get('view.approvalListNum');
  return {
    page,
    pagesize
  };
}

function getEmptyData(pagesize, forDownload) {
  return wrapResponseData({
    list: [],
    totalrows: 0,
    page: 1,
    pagesize,
  }, forDownload);
}

function wrapResponseData(data, forDownload) {
  if (!forDownload) {
    return data;
  }
  return ['审批类型', '申请人', '申请时间', '内容'].concat(data.list[0] && data.list[0].template.forms.map(f => f.label)).filter(i => i).concat('状态').join(',')
    + '\n' +
    data.list
    .map(i => {
      let item = [
        i.template.name,
        i.from.name,
        moment(i.apply_date).format('YYYY-MM-DD HH:mm'),
        i.content,
      ];
      i.forms.forEach(f => item.push(f.value || ''));
      if (i.is_processing) {
        item.push(i.is_processing ? '待处理' : '已处理');
      } else {
        item.push(i.status == 'processing' ? '待处理' : '已处理');
      }
      return item.join(',');
    })
    .join('\n');
}
