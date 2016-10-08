import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import { sanitization, validation, statusSanitization, statusValidation } from './schema';
import C from 'lib/constants';
import Structure from 'models/structure';
import Approval from 'models/approval';
import { checkUserType } from '../utils';

let api = express.Router();
export default api;

api.get('/', (req, res, next) => {
  let { user } = req.query;
  let masterQuery = {
    company_id: req.company._id,
    status: {
      $ne: C.APPROVAL_STATUS.DELETED
    }
  };
  db.approval.template.master.find(masterQuery, {
    current: 1
  })
  .then(masters => {
    masters = masters.map(master => master.current);
    if (!masters.length) {
      return res.json([]);
    }
    let condition = {
      _id: {
        $in: masters
      },
      status: {
        $ne: C.APPROVAL_STATUS.DELETED
      }
    };
    if (user && ObjectId.isValid(user)) {
      user = ObjectId(user);
      condition.scope = {
        $in: new Structure(req.company.structure).findMemberDepartments(user)
      };
    }
    return db.approval.template.find(condition, {
      name: 1,
      description: 1,
      scope: 1,
      status: 1,
      number: 1,
    })
    .sort({
      name: 1
    })
    .then(template => {
      let tree = new Structure(req.company.structure);
      template.forEach(item => {
        if (item.scope) {
          item.scope = item.scope.map(scope => _.pick(tree.findNodeById(scope), '_id', 'name'));
        }
      });
      res.json(template);
    });
  })
  .catch(next);
});

api.get('/related', (req, res, next) => {
  let { type } = req.query;
  let user = req.user._id;
  let tplCondition = {
    company_id: req.company._id
  };
  let itemCondition = {};
  let fields = {
    name: 1,
    status: 1,
    number: 1,
    master_id: 1,
  };
  switch (type) {
  case 'approve':
    tplCondition['steps.approver._id'] = user;
    break;
  case 'copyto':
    tplCondition['steps.copy_to._id'] = user;
    break;
  default:
    tplCondition.scope = {
      $in: new Structure(req.company.structure).findMemberDepartments(user)
    };
    itemCondition.from = user;
  }
  db.approval.template.find(tplCondition, fields)
  .then(tpls => Promise.filter(tpls, tpl => db.approval.item.count(_.extend({
    template: tpl._id,
  }, itemCondition))))
  .then(tpls => {
    // template used push ahead
    let newTpls = [];
    tpls.forEach(tpl => {
      if (tpl.status == C.APPROVAL_STATUS.NORMAL) {
        newTpls.push(tpl);
      }
    });
    tpls.forEach(tpl => {
      if (tpl.status != C.APPROVAL_STATUS.NORMAL) {
        newTpls.push(tpl);
      }
    });
    res.json(newTpls);
  })
  .catch(next);
});

api.post('/', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(sanitization, validation, data);
  data.steps.forEach(i => {
    i._id = ObjectId();
  });
  checkAndInitForms(data.forms);
  data.company_id = req.company._id;
  data.status = C.APPROVAL_STATUS.UNUSED;
  Approval.createTemplate(data)
  .then(template => {
    res.json(template);
    return addActivity(req, C.ACTIVITY_ACTION.CREATE, {
      approval_template: template._id,
      company: null
    });
  })
  .catch(next);
});

api.put('/:template_id', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  let data = req.body;
  let template_id = ObjectId(req.params.template_id);
  sanitizeValidateObject(sanitization, validation, data);
  data.steps.forEach(i => {
    i._id = ObjectId();
  });
  checkAndInitForms(data.forms);
  let condition = {
    _id: template_id,
    company_id: req.company._id,
    status: {
      $nin: [C.APPROVAL_STATUS.DELETED, C.APPROVAL_STATUS.OLD_VERSION]
    }
  };
  db.approval.template.findOne(condition, {
    master_id: 1,
    status: 1,
    for: 1,
    forms_not_editable: 1,
    forms: 1,
    number: 1,
  })
  .then(oldTpl => {
    if (!oldTpl) {
      throw new ApiError(404, 'approval_template_not_exists');
    }
    if (oldTpl.status != C.APPROVAL_STATUS.UNUSED) {
      throw new ApiError(400, 'cannot_modify');
    }
    if (oldTpl.forms_not_editable) {
      data.forms = oldTpl.forms; // 不能修改表单
    }
    return db.approval.item.count({
      template: template_id,
    })
    .then(count => {
      if (!count) {
        return db.approval.template.update({
          _id: template_id
        }, {
          $set: data
        })
        .then(() => res.json(_.extend(oldTpl, data)));
      } else {
        let number = oldTpl.number.toString().split('-');
        number[1] = (parseInt(number[1]) || 0) + 1;
        _.extend(data, {
          master_id: oldTpl.master_id,
          company_id: req.company._id,
          status: C.APPROVAL_STATUS.UNUSED,
          number: `${number[0]}-${number[1]}`
        });
        return Promise.all([
          db.approval.template.insert(data)
          .then(newTpl => {
            res.json(newTpl);
            return db.approval.template.master.update({
              _id: oldTpl.master_id
            }, {
              $set: {
                current: newTpl._id
              },
              $push: {
                reversions: newTpl._id
              }
            });
          }),
          Approval.cancelItemsUseTemplate(req, template_id, C.ACTIVITY_ACTION.UPDATE),
          db.approval.template.update({
            _id: template_id
          }, {
            $set: {
              status: C.APPROVAL_STATUS.OLD_VERSION
            }
          })
        ]);
      }
    });
  })
  .then(() => addActivity(req, C.ACTIVITY_ACTION.UPDATE, {
    approval_template: template_id
  }))
  .catch(next);
});

api.get('/:template_id', (req, res, next) => {
  let template_id = ObjectId(req.params.template_id);
  db.approval.template.findOne({
    _id: template_id,
    company_id: req.company._id
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(404);
    }
    res.json(mapCompanyInfo(req.company, doc)[0]);
  })
  .catch(next);
});

api.get('/:template_id/versions', (req, res, next) => {
  let template_id = ObjectId(req.params.template_id);
  db.approval.template.findOne({
    _id: template_id,
    company_id: req.company._id,
  }, {
    master_id: 1
  })
  .then(template => {
    return db.approval.template.find({
      master_id: template.master_id
    }, {
      name: 1,
      number: 1
    })
    .sort({
      _id: -1
    })
    .then(versions => res.json(versions));
  })
  .catch(next);
});

api.put('/:template_id/status', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  let data = req.body;
  let template_id = ObjectId(req.params.template_id);
  sanitizeValidateObject(statusSanitization, statusValidation, data);
  db.approval.template.update({
    _id: template_id,
    company_id: req.company._id,
    status: {
      $ne: C.APPROVAL_STATUS.DELETED
    }
  }, {
    $set: data
  })
  .then(doc => {
    res.json(doc);
    if (!doc.nModified) {
      return;
    }
    if (data.status == C.APPROVAL_STATUS.UNUSED) {
      addActivity(req, C.ACTIVITY_ACTION.DISABLE, {
        approval_template: template_id
      });
      return Approval.cancelItemsUseTemplate(req, template_id, C.ACTIVITY_ACTION.UPDATE);
    } else {
      return addActivity(req, C.ACTIVITY_ACTION.ENABLE, {
        approval_template: template_id
      });
    }
  })
  .catch(next);
});

api.delete('/:template_id', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  let template_id = ObjectId(req.params.template_id);
  db.approval.template.findAndModify({
    query: {
      _id: template_id,
      company_id: req.company._id
    },
    update: {
      $set: {
        status: C.APPROVAL_STATUS.DELETED
      }
    },
    fields: {
      master_id: 1
    }
  })
  .then(template => {
    if (!template || !template.value) {
      throw new ApiError(404);
    }
    return Promise.all([
      db.approval.template.master.update({
        _id: template.value.master_id
      }, {
        $set: {
          status: C.APPROVAL_STATUS.DELETED
        }
      }),
      Approval.cancelItemsUseTemplate(req, template_id, C.ACTIVITY_ACTION.DELETE),
      addActivity(req, C.ACTIVITY_ACTION.DELETE, {
        approval_template: template_id
      })
    ]);
  })
  .then(() => res.json({}))
  .catch(next);
});

function addActivity(req, action, data) {
  let info = {
    action: action,
    target_type: C.OBJECT_TYPE.APPROVAL_TEMPLATE,
    company: req.company._id,
    creator: req.user._id,
  };
  _.extend(info, data);
  return req.model('activity').insert(info);
}

function mapCompanyInfo(company, data) {
  let tree = new Structure(company.structure);
  if (!_.isArray(data)) {
    data = [data];
  }
  data.forEach(item => {
    item.scope = item.scope && item.scope.map(scope => _.pick(tree.findNodeById(scope), '_id', 'name'));
    item.steps.forEach(step => {
      if (step.approver.type == 'member') {
        _.extend(step.approver, _.pick(_.find(company.members, member => member._id.equals(step.approver._id)), 'name'));
      } else {
        _.extend(step.approver, _.pick(tree.findNodeById(step.approver._id), '_id', 'name'));
      }
      if (step.copy_to && step.copy_to.length) {
        step.copy_to.forEach(copyto => {
          if (copyto.type == 'member') {
            _.extend(copyto, _.pick(_.find(company.members, member => member._id.equals(copyto._id)), 'name'));
          } else {
            _.extend(copyto, _.pick(tree.findNodeById(copyto._id), '_id', 'name'));
          }
        });
      }
    });
  });
  return data;
}

function checkAndInitForms(forms) {
  if (forms && forms.length) {
    forms.forEach(i => {
      i._id = ObjectId();
    });
    if (forms.length != _.uniq(forms.map(f => f.label)).length) {
      throw new ApiError(400, 'form_label_unique');
    }
  }
}
