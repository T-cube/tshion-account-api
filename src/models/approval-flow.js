import _ from 'underscore';
import moment from 'moment';
import config from 'config';
import json2csv from 'json2csv';
import Promise from 'bluebird';
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
    if (this.type == 'copyto') {
      this.type = 'copy_to';
    }
  }

  findItems() {
    let type = this.type;
    return ApprovalFlow
    .getFlowByType(this.company_id, this.user_id, type)
    .then(flow => {
      let { page, pagesize } = this.getPageInfo();
      if (!flow || !flow[type] || !flow[type].length) {
        return this.getEmptyData(pagesize);
      }
      return this.getQueryCondition(flow[type])
      .then(condition => {
        let data = {};
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
          listing = db.approval.item.find(condition, this.fetchItemFields)
            .sort({_id: -1});
        }
        return Promise.all([
          counting,
          listing
          .then(list => {
            let templateFields = this.forDownload ? 'name,status,forms' : 'name,status';
            return Promise.all([
              mapObjectIdToData(list, 'approval.template', templateFields, 'template'),
              fetchCompanyMemberInfo(this.company, list, 'from')
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
        .then(() => data);
      });
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
      let match = /master_id-(\w+)/.exec(template);
      if (match && ObjectId.isValid(match[1])) {
        return db.approval.template.find({
          master_id: ObjectId(match[1])
        }, {
          _id: 1
        })
        .then(tpls => {
          condition.template = {
            $in: tpls.map(tpl => tpl._id)
          };
          return condition;
        });
      }
      if (ObjectId.isValid(template)) {
        condition.template = ObjectId(template);
      }
    }
    return Promise.resolve(condition);
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
        $gte: moment().startOf('month').toDate(),
        $lt: new Date(),
      };
    } else if (export_count == 'last_month') {
      apply_date = {
        $gte: moment().add(-1, 'month').startOf('month').toDate(),
        $lt: moment().startOf('month').toDate(),
      };
    }
    return apply_date ? {apply_date} : {};
  }

  getEmptyData(pagesize) {
    return {
      list: [],
      totalrows: 0,
      page: 1,
      pagesize,
    };
  }

  wrapCsvData(data) {
    if (!this.forDownload) {
      return data;
    }
    if (!data.list.length) {
      return '';
    }
    let formFields = _.uniq(_.flatten(data.list.map(i => i.template.forms && i.template.forms.map(f => {if (f.required) {return f.label;} else {return [];}})).filter(i => i)));
    let parsedData = data.list.map(i => {
      let item = [
        moment(i.apply_date).format('YYYY-MM-DD HH:mm'),
        i.template.name,
        i.from.name,
        i.content,
      ];
      formFields.forEach(ff => {
        let itf = _.find(i.template.forms, itfitem => itfitem.label == ff);
        if (itf) {
          i.forms.forEach(f => {
            let templateForm = _.find(i.template.forms, tf => tf._id.equals(itf._id) && tf._id.equals(f._id));
            if (templateForm) {
              switch (templateForm.type) {
                case 'date':
                  f.value = moment(f.value).format('YYYY-MM-DD');
                  break;
                case 'datetime':
                  f.value = moment(f.value).format('YYYY-MM-DD HH:mm');
                  break;
              }
              item.push(f.value || '');
            }
          });
        } else {
          item.push('');
        }
      });
      if (i.is_processing) {
        item.push(i.is_processing ? __('processing') : __('processed'));
      } else {
        item.push(ApprovalFlow.getStatusText(i.status));
      }
      return item;
    });
    return json2csv({
      data: parsedData,
      fieldNames: [__('apply_time'), __('approval_type'), __('approval_applyer'), __('content')]
        .concat(formFields)
        .concat(__('status'))
    });
  }

  static getStatusText(status) {
    let info;
    switch (status) {
      case C.APPROVAL_ITEM_STATUS.PROCESSING:
        info = __('approval_pressing');
        break;
      case C.APPROVAL_ITEM_STATUS.APPROVED:
        info = __('approval_approved');
        break;
      case C.APPROVAL_ITEM_STATUS.REJECTED:
        info = __('approval_rejected');
        break;
      case C.APPROVAL_ITEM_STATUS.REVOKED:
        info = __('approval_revoked');
        break;
      case C.APPROVAL_ITEM_STATUS.TEMPLATE_CHNAGED:
        info = __('approval_template_change');
        break;
      default:
        info = '';
    }
    return info;
  }

}
