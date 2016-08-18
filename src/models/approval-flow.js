import _ from 'underscore';
import moment from 'moment';
import config from 'config';
import json2csv from 'json2csv';
import { ObjectId } from 'mongodb';

import db from 'lib/database';
import C from 'lib/constants';
// import Structure from 'models/structure';
import { mapObjectIdToData, fetchCompanyMemberInfo } from 'lib/utils';

export default class ApprovalFlow {

  /**
   * @query {page, pagesize, status, template, export_count}
   */
  constructor(options) {
    this.company = options.company;
    this.company_id = options.company._id;
    this.user_id = options.user_id;
    this.type = options.type;
    this.query = options.query || {};
    this.forDownload = options.forDownload || false;
    this.fetchItemFields = {
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
    if (this.forDownload) {
      this.fetchItemFields.forms = 1;
    }
  }

  findItems() {
    let type = this.type;
    return ApprovalFlow
    .getFlowByType(this.company_id, this.user_id, type)
    .then(flow => {
      if (!flow || !flow[type] || !flow[type].length) {
        return this.getEmptyData(pagesize);
      }
      let condition = this.getQueryCondition(flow[type]);
      let data = {};
      let { page, pagesize } = this.getPageInfo();
      let { export_count } = this.query;
      let counting = null;
      let listing = null;
      _.extend(condition, this.getApplyDateCondition());
      if (!this.forDownload) {
        counting = db.approval.item.count(condition)
        .then(sum => {
          data.totalrows = sum;
          data.page = page;
          data.pagesize = pagesize;
        });
      }
      if (!this.forDownload || !export_count || export_count == 'page') {
        listing = db.approval.item.find(condition, this.fetchItemFields)
        .sort({_id: -1})
        .skip((page - 1) * pagesize)
        .limit(pagesize);
      } else {
        listing = db.approval.item.find(condition, this.fetchItemFields);
      }
      return Promise.all([
        counting,
        listing
        .then(list => {
          return Promise.all([
            mapObjectIdToData(list, 'approval.template', 'name,status,forms.label', 'template'),
            fetchCompanyMemberInfo(this.company.members, list, 'from')
          ])
          .then(() => list);
        })
        .then(list => {
          // let tree = new Structure(this.company.structure);
          list.forEach(item => {
            // item.department && (item.department = tree.findNodeById(item.department));
            if (this.type == 'approve') {
              let approve = flow[type];
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
            }
          });
          data.list = list;
        })
      ])
      .then(() => this.wrapResponseData(data, this.forDownload));
    });
  }

  static getFlowByType(company_id, user_id, type) {
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

  getQueryCondition(flowType) {
    let { status, template } = this.query;
    let condition;
    if (this.type == 'approve') {
      condition = {
        _id: {
          $in: flowType.map(f => f._id)
        }
      };
      if (status == 'processing') {
        condition.step = {
          $in: flowType.map(item => item.step)
        };
        condition.status = C.APPROVAL_ITEM_STATUS.PROCESSING;
      } else if (status == 'resolved') {
        condition.step = {
          $nin: flowType.map(item => item.step)
        };
      }
    } else {
      condition = {
        _id: {
          $in: flowType
        }
      };
      if (status == 'processing') {
        condition.status = C.APPROVAL_ITEM_STATUS.PROCESSING;
      }
      if (status == 'resolved') {
        condition.status = {
          $ne: C.APPROVAL_ITEM_STATUS.PROCESSING
        };
      }
    }
    if (template) {
      condition.template = ObjectId(template);
    }
    return condition;
  }

  getPageInfo() {
    let { page, pagesize } = this.query;
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

  getApplyDateCondition() {
    let { export_count } = this.query;
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
    return apply_date ? {apply_date} : {};
  }

  getEmptyData(pagesize) {
    return this.wrapResponseData({
      list: [],
      totalrows: 0,
      page: 1,
      pagesize,
    }, this.forDownload);
  }

  wrapResponseData(data) {
    if (!this.forDownload) {
      return data;
    }
    if (!data.list.length) {
      return '';
    }
    return json2csv({
      data: data.list
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
          item.push(ApprovalFlow.getStatusText(i.status));
        }
        return item;
      }),
      fieldNames: ['审批类型', '申请人', '申请时间', '内容']
        .concat(data.list[0] && data.list[0].template.forms.map(f => f.label))
        .filter(i => i)
        .concat('状态')
    });
  }

  static getStatusText(status) {
    let info;
    switch (status) {
    case C.APPROVAL_ITEM_STATUS.PROCESSING:
      info = '审批中';
      break;
    case C.APPROVAL_ITEM_STATUS.APPROVED:
      info = '已同意';
      break;
    case C.APPROVAL_ITEM_STATUS.REJECTED:
      info = '已驳回';
      break;
    case C.APPROVAL_ITEM_STATUS.REVOKED:
      info = '已撤回';
      break;
    case C.APPROVAL_ITEM_STATUS.TEMPLATE_CHNAGED:
      info = '审批中断-该申请所使用的流程已变更';
      break;
    default:
      info = '';
    }
    return info;
  }

}