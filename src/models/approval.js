import _ from 'underscore';

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
      template.steps.forEach(step => {
        data.steps.push({
          _id: step._id,
          status: C.APPROVAL_ITEM_STATUS.PROCESSING
        })
      });
      // data.forms.forEach(form => {
      //   form.title = (_.find(template.forms, tpl_form => tpl_form._id.equals(form._id))).title;
      // });
      return db.approval.item.insert(data)
      .then(item => {
        let item_id = item._id;
        req.model('activity').insert({
          approval_item: item_id,
          action: C.ACTIVITY_ACTION.CREATE,
          target_type: C.OBJECT_TYPE.APPROVAL_ITEM,
          company: req.company._id,
          creator: req.user._id,
        })
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
              })
            })
          } else {
            return db.approval.flow.update({
              _id: flow_id
            }, {
              $push: {
                apply: item_id
              }
            })
          }
        })
        .then(() => {
          return this.prepareNextStep(req, item_id, template.steps, data.step)
        })
        .then(() => item)
      })
    })
  }

  static prepareNextStep(req, item_id, steps, step_id) {
    let company = req.company;
    let { copyto, approver } = this.getStepRelatedMembers(company.structure, steps, step_id);
    return Promise.all(copyto.map(user_id => {
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
            })
          })
        } else {
          return db.approval.flow.update({
            _id: flow_id
          }, {
            $push: {
              copy_to: item_id
            }
          })
        }
      })
      .then(() => {
        return Promise.all(approver.map(user_id => {
          return db.approval.user.findOne({
            _id: user_id,
            'map.company_id': company._id
          }, {
            'map.$': 1
          })
          .then(mapData => {
            console.log(mapData);
            let flow_id = mapData ? mapData.map[0].flow_id : null;
            if (!mapData || !flow_id) {
              return db.approval.flow.insert({
                approve: [item_id]
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
                })
              })
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
              })
            }
          })
        }))
      })
      .then(() => {
        let notification = {
          approval_item: item_id,
          target_type: C.OBJECT_TYPE.APPROVAL_ITEM,
          company: company._id,
          from: req.user._id,
        }
        return Promise.all([
          approver.length && req.model('notification').send(_.extend(notification, {
            action: C.ACTIVITY_ACTION.APPROVAL_APPERVER,
            to: approver,
          })),
          copyto.length && req.model('notification').send(_.extend(notification, {
            action: C.ACTIVITY_ACTION.APPROVAL_COPYTO,
            to: copyto,
          }))
        ])
      })
    }))
  }

  static createTemplate(template) {
    return db.approval.template.insert(template)
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
        })
      })
      .then(() => template)
    })
  }

  static getStepRelatedMembers(structure, steps, step_id) {
    let step = _.find(steps, i => i._id.equals(step_id));
    let approver = [];
    let copyto = [];
    structure = new Structure(structure);
    if (step.approver.type == C.APPROVER_TYPE.DEPARTMENT) {
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
    })
    return {
      copyto: uniqObjectId(copyto),
      approver: uniqObjectId(approver)
    }
  }

}
