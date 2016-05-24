import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import { itemSanitization, itemValidation, stepSanitization, stepValidation } from './schema';
import Structure from 'models/structure';
import C from 'lib/constants';
import { oauthCheck } from 'lib/middleware';
import { uniqObjectId, diffObjectId, mapObjectIdToData } from 'lib/utils';

let api = require('express').Router();
export default api;

api.use(oauthCheck());

api.post('/', (req, res, next) => {
  let data = req.body;
  let user_id = req.user._id;
  let company_id = req.company._id;
  sanitizeValidateObject(itemSanitization, itemValidation, data);
  _.extend(data, {
    from: user_id,
    company_id: company_id,
    apply_date: new Date(),
    status: C.APPROVAL_ITEM_STATUS.PROCESSING,
    is_archived: false,
  });
  db.approval.template.findOne({
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
    data.forms.forEach(form => {
      form.title = (_.find(template.forms, tpl_form => tpl_form._id.equals(form._id))).title;
    });
    return db.approval.item.insert(data)
    .then(doc => {
      res.json(doc);
      let item_id = doc._id;
      return db.approval.user.findOne({
        _id: user_id,
        'map.company_id': company_id
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
              _id: user_id,
            }, {
              $push: {
                map: {
                  company_id: company_id,
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
        return prepareNextStep(req.company, item_id, template._id, data.step)
      })
    })
  })
  .catch(next);
});

api.get('/:item_id', (req, res, next) => {
  let item_id = ObjectId(req.params.item_id);
  db.approval.item.findOne({
    _id: item_id
  })
  .then(data => {
    return mapObjectIdToData(data, [
      ['approval.template', 'name,steps,forms', 'template'],
    ])
  })
  .then(data => {
    let tree = new Structure(req.company.structure);
    data.from = _.find(req.company.members, member => member._id = data.from);
    data.steps.forEach(step => {
      if (step.approver) {
        step.approver = _.find(req.company.members, member => member._id = step.approver);
      }
    });
    data.scope = data.scope ? data.scope.map(scope => tree.findNodeById(scope)) : [];
    data.department = tree.findNodeById(data.department);
    res.json(data);
  })
  .catch(next);
});

api.put('/:item_id/status', (req, res, next) => {
  let status = req.body.status;
  let item_id = ObjectId(req.params.item_id);
  if (status != C.APPROVAL_ITEM_STATUS.REVOKED) {
    throw new ApiError(400, null, 'wrong status');
  }
  db.approval.item.update({
    _id: item_id,
    from: req.user._id
  }, {
    $set: {
      status: status,
      step: null
    }
  })
  .then(doc => res.json(doc))
  .catch(next);
});

api.put('/:item_id/steps', (req, res, next) => {
  let item_id = ObjectId(req.params.item_id);
  let data = req.body;
  sanitizeValidateObject(stepSanitization, stepValidation, data);
  db.approval.item.findOne({
    _id: item_id,
    status: C.APPROVAL_ITEM_STATUS.PROCESSING
  }, {
    step: 1,
    steps: 1,
    template: 1,
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(400);
    }
    let { step, steps, template } = doc;
    if (!step.equals(data._id)) {
      throw new ApiError(403, null);
    }

    let k = _.findIndex(steps, item => item._id.equals(step));
    let thisStep =  steps[k];
    let nextStep = steps[k + 1] ? steps[k + 1] : null;

    let update = {
      step: nextStep ? nextStep._id : null,
      log: data.log,
      'steps.$.approver': req.user._id,
      'steps.$.status': data.status,
      'steps.$.create_time': new Date(),
      // 'steps.$.log': data.log,
    };
    if (!nextStep && data.status == C.APPROVAL_ITEM_STATUS.APPROVED) {
      update.status = C.APPROVAL_ITEM_STATUS.APPROVED;
    }
    if (data.status == C.APPROVAL_ITEM_STATUS.REJECTED) {
      update.status = C.APPROVAL_ITEM_STATUS.REJECTED;
    }

    return db.approval.item.update({
      _id: item_id,
      'steps._id': data._id
    }, {
      $set: update
    })
    .then(doc => {
      if (nextStep && data.status == C.APPROVAL_ITEM_STATUS.APPROVED) {
        return prepareNextStep(req.company, item_id, template, nextStep._id);
      }
    })
  })
  .then(() => res.json({}))
  .catch(next);
});

function prepareNextStep(company, item_id, template, step_id) {
  return db.approval.template.findOne({
    _id: template
  }, {
    steps: 1
  })
  .then(doc => {
    let step = _.find(doc.steps, i => i._id.equals(step_id));
    let approver = [];
    let copyto = [];
    let structure = new Structure(company.structure);

    if (step.approver.type == C.APPROVER_TYPE.DEPARTMENT) {
      approver = structure.findMemberByPosition(step.approver._id);
    } else {
      approver = [step.approver._id];
    }

    step.copy_to.forEach(i => {
      if (i.type == C.APPROVER_TYPE.DEPARTMENT) {
        copyto = copyto.concat(structure.findMemberByPosition(i._id));
      } else {
        copyto = copyto.concat(i._id);
      }
    });

    copyto = uniqObjectId(copyto);
    approver = uniqObjectId(approver);

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
    }))
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
  })
}
