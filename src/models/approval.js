import _ from 'underscore';
import moment from 'moment';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import C from 'lib/constants';
import Structure from 'models/structure';
import { uniqObjectId } from 'lib/utils';

export default class Approval {

  constructor() {}

  static createItem(data, req) {
    return db.approval.template.findOne({
      _id: data.template
    })
    .then(template => {
      if (!template) {
        throw new ApiError(400, null, 'approval template is not existed');
      }
      data.step = template.steps[0] ? template.steps[0]._id : null;
      data.steps = [];
      data.title = template.name;
      if (template.for) {
        data.for = template.for;
      }
      template.steps.forEach(step => {
        data.steps.push({
          _id: step._id,
          status: C.APPROVAL_ITEM_STATUS.PROCESSING
        });
      });
      template.forms.forEach(form => {
        if (form.required) {
          let userForm = _.find(data.forms, userFormItem => form._id.equals(userFormItem._id));
          if (!userForm || !userForm.value) {
            throw new ApiError(400, null, '请填写必填的内容');
          }
        }
      });
      // data.forms.forEach(form => {
      //   form.title = (_.find(template.forms, tpl_form => tpl_form._id.equals(form._id))).title;
      // });
      return db.approval.item.insert(data)
      .then(item => {
        let item_id = item._id;
        // req.model('activity').insert({
        //   approval_item: item_id,
        //   action: C.ACTIVITY_ACTION.CREATE,
        //   target_type: C.OBJECT_TYPE.APPROVAL_ITEM,
        //   company: req.company._id,
        //   creator: req.user._id,
        // });
        return db.approval.user.findOne({
          _id: data.from,
          'map.company_id': data.company_id
        }, {
          'map.$': 1
        })
        .then(mapData => {
          let flow_id = mapData ? mapData.map[0].flow_id : null;
          if (!mapData || !flow_id) {
            return db.approval.flow.insert({
              apply: [item_id]
            })
            .then(inserted => {
              return db.approval.user.update({
                _id: data.from,
              }, {
                $push: {
                  map: {
                    company_id: data.company_id,
                    flow_id: inserted._id
                  }
                }
              }, {
                upsert: true
              });
            });
          } else {
            return db.approval.flow.update({
              _id: flow_id
            }, {
              $push: {
                apply: item_id
              }
            });
          }
        })
        .then(() => this.prepareNextStep(req, item_id, template.steps, data.step))
        .then(() => item);
      });
    });
  }

  static prepareNextStep(req, item_id, steps, step_id) {
    let company = req.company;
    let { copyto, approver } = this.getStepRelatedMembers(company.structure, steps, step_id);
    let addingApprover = approver.map(user_id => {
      return db.approval.user.findOne({
        _id: user_id,
        'map.company_id': company._id
      }, {
        'map.$': 1
      })
      .then(mapData => {
        let flow_id = mapData ? mapData.map[0].flow_id : null;
        if (!mapData || !flow_id) {
          return db.approval.flow.insert({
            approve: [{
              _id: item_id,
              step: step_id
            }]
          })
          .then(inserted => {
            return db.approval.user.update({
              _id: user_id
            }, {
              $push: {
                map: {
                  company_id: company._id,
                  flow_id: inserted._id
                }
              }
            }, {
              upsert: true
            });
          });
        } else {
          return db.approval.flow.update({
            _id: flow_id
          }, {
            $push: {
              approve: {
                _id: item_id,
                step: step_id
              }
            }
          });
        }
      });
    });
    return Promise.all(addingApprover)
    .then(() => {
      let addingCopyto = copyto.map(user_id => {
        return db.approval.user.findOne({
          _id: user_id,
          'map.company_id': company._id
        }, {
          'map.$': 1
        })
        .then(mapData => {
          let flow_id = mapData ? mapData.map[0].flow_id : null;
          if (!mapData || !flow_id) {
            return db.approval.flow.insert({
              copy_to: [item_id]
            })
            .then(inserted => {
              return db.approval.user.update({
                _id: user_id,
              }, {
                $push: {
                  map: {
                    company_id: company._id,
                    flow_id: inserted._id
                  }
                }
              }, {
                upsert: true
              });
            });
          } else {
            return db.approval.flow.update({
              _id: flow_id
            }, {
              $push: {
                copy_to: item_id
              }
            });
          }
        });
      });
      return addingCopyto;
    })
    .then(() => {
      let notification = {
        approval_item: item_id,
        target_type: C.OBJECT_TYPE.APPROVAL_ITEM,
        company: company._id,
        from: req.user._id,
      };
      return Promise.all([
        approver.length && req.model('notification').send(_.extend(notification, {
          action: C.ACTIVITY_ACTION.SUBMIT,
          to: approver,
        })),
        // copyto.length && req.model('notification').send(_.extend(notification, {
        //   action: C.ACTIVITY_ACTION.COPY,
        //   to: copyto,
        // }))
      ]);
    });
  }

  static createTemplate(template) {
    return db.approval.template.findOne({
      $query: {
        company_id: template.company_id
      },
      $orderby: {
        number: -1
      },
    }, {
      number: 1
    })
    .then(lastTpl => {
      _.extend(template, {
        number: this.generateNumber(lastTpl && lastTpl.number),
        date_update: new Date(),
      });
      return db.approval.template.insert(template);
    })
    .then(template => {
      return db.approval.template.master.insert({
        company_id: template.company_id,
        reversions: [template._id],
        current: template._id,
      })
      .then(master => {
        return db.approval.template.update({
          _id: template._id,
        }, {
          $set: {
            master_id: master._id
          }
        });
      })
      .then(() => template);
    });
  }

  static getStepRelatedMembers(structure, steps, step_id) {
    let step = _.find(steps, i => i._id.equals(step_id));
    let approver = [];
    let copyto = [];
    structure = new Structure(structure);
    if (step.approver && step.approver.type == C.APPROVER_TYPE.DEPARTMENT) {
      approver = structure.findMemberByPosition(step.approver._id);
    } else {
      approver = [step.approver._id];
    }
    step.copy_to && step.copy_to.forEach(i => {
      if (i.type == C.APPROVER_TYPE.DEPARTMENT) {
        copyto = copyto.concat(structure.findMemberByPosition(i._id));
      } else {
        copyto = copyto.concat(i._id);
      }
    });
    return {
      copyto: uniqObjectId(copyto),
      approver: uniqObjectId(approver)
    };
  }

  static generateNumber(lastNum) {
    let prefix = moment().format('YYMMDD');
    if (!lastNum || !RegExp('^' + prefix).test(lastNum)) {
      return prefix + '01';
    }
    return parseInt(lastNum) + 1 + '';
  }

  static cancelItemsUseTemplate(req, template_id) {
    return db.approval.item.find({
      template: template_id,
      status: C.APPROVAL_ITEM_STATUS.PROCESSING,
    }, {
      from: 1
    })
    .then(items => {
      if (!items.length) {
        return;
      }
      let itemIdList = items.map(item => item._id);
      let notification = {
        action: C.ACTIVITY_ACTION.CANCEL,
        target_type: C.OBJECT_TYPE.APPROVAL_ITEM,
        company: req.company._id,
        from: req.user._id,
      };
      return Promise.all(
        items.map(item => {
          return req.model('notification').send(_.extend(notification, {
            to: item.from,
            approval_item: item._id,
          }));
        })
        .concat(db.approval.item.update({
          _id: {
            $in: itemIdList
          }
        }, {
          $set: {
            status: C.APPROVAL_ITEM_STATUS.TEMPLATE_CHNAGED,
            step: null,
          }
        }))
      );
    });
  }

}
