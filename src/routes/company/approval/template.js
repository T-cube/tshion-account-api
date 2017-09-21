import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import { sanitization, validation, statusSanitization, statusValidation, autoSanitization, autoValidation, changeAutoSanitization, changeAutoValidation } from './schema';
import C from 'lib/constants';
import Structure from 'models/structure';
import CompanyLevel from 'models/company-level';
import Approval from 'models/approval';
import { checkUserType } from '../utils';
import Plan from 'models/plan/plan';


const api = express.Router();
export default api;

api.get('/', (req, res, next) => {
  let { user } = req.query;
  let masterQuery = {
    company_id: req.company._id,
    status: {
      $ne: C.APPROVAL_STATUS.DELETED
    },
    auto: {
      $ne: true
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
      for: 1,
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
      return db.approval.auto.find({
        company_id: req.company._id,
        status: C.APPROVAL_STATUS.NORMAL
      })
      .then(list => {
        let total = template;
        if (list && list.length) {
          total = [].concat(template, list);
        }
        res.json(total);
      });
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
    for: 1,
  };
  switch (type) {
    case 'approve':
      tplCondition['steps.approver._id'] = user;
      break;
    case 'copyto':
      tplCondition['steps.copy_to._id'] = user;
      break;
    default:
      // tplCondition.scope = {
      //   $in: new Structure(req.company.structure).findMemberDepartments(user)
      // };
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
  let companyLevel = new CompanyLevel(req.company._id);
  let data = req.body;
  companyLevel.canAddApprovalTemplete().then(enabled => {
    if (!enabled) {
      throw new ApiError(400, 'reach_plan_limit');
    }
    if (!data.auto) {
      sanitizeValidateObject(sanitization, validation, data);
      data.steps.forEach(i => {
        i._id = ObjectId();
      });
      checkAndInitForms(data.forms);
      data.company_id = req.company._id;
      data.status = C.APPROVAL_STATUS.NORMAL;
      return Approval.createTemplate(data);
    } else {
      sanitizeValidateObject(autoSanitization, autoValidation, data);
      checkAndInitForms(data.forms);
      data.company_id = req.company._id;
      data.templates = [];
      data.status = C.APPROVAL_STATUS.NORMAL;
      return Approval.createAutoTemplate(data);
    }
  })
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
  db.approval.auto.findOne({
    _id: template_id
  })
  .then(tpl => {
    if (!tpl) {
      sanitizeValidateObject(sanitization, validation, data);
      data.steps.forEach(i => {
        i._id = ObjectId();
      });
      checkAndInitForms(data.forms);
      let criteria = {
        _id: template_id,
        company_id: req.company._id,
        status: C.APPROVAL_STATUS.UNUSED
      };
      return Approval.createNewVersionTemplate(data, {
        criteria
      })
      .then(newTpl => {
        res.json(newTpl);
        addActivity(req, C.ACTIVITY_ACTION.UPDATE, {
          approval_template: template_id
        });
        return Approval.cancelItemsUseTemplate(req, template_id);
      });
    } else {
      sanitizeValidateObject(changeAutoSanitization, changeAutoValidation, data);
      checkAndInitForms(data.forms);
      return Promise.map(tpl.templates, item => {
        return db.approval.template.findOneAndUpdate({
          _id: item.template_id
        }, {
          $set: {
            status: C.APPROVAL_STATUS.UNUSED
          }
        }, {
          returnOriginal: false,
          returnNewDocument: true
        })
        .then(doc => {
          let old = doc.value;
          data.scope = old.scope;
          data.steps = old.steps;
          data.steps[0].copy_to = data.copy_to;
          let criteria = {
            _id: old._id,
            company_id: req.company._id,
            status: C.APPROVAL_STATUS.UNUSED
          };
          return Approval.createNewVersionTemplate(data, {
            criteria
          })
          .then(() => {
            return Approval.cancelItemsUseTemplate(req, old._id);
          });
        });
      })
      .then(() => {
        return db.approval.auto.findOneAndUpdate({
          _id: template_id
        }, {
          $set: {
            name: data.name,
            description: data.description,
            forms: data.forms
          }
        }, {
          returnOriginal: false,
          returnNewDocument: true
        })
        .then(doc => {
          res.json(doc.value);
        });
      });
    }
  })
  .catch(next);
});

api.get('/:template_id', (req, res, next) => {
  let template_id = ObjectId(req.params.template_id);
  db.approval.auto.findOne({
    _id: template_id
  })
  .then(doc => {
    if (doc) {
      return res.json(doc);
    }
    return db.approval.template.findOne({
      _id: template_id,
      company_id: req.company._id
    })
    .then(doc => {
      if (!doc) {
        throw new ApiError(404);
      }
      res.json(mapCompanyInfo(req.company, doc)[0]);
    });
  })
  .catch(next);
});

api.get('/:template_id/versions', (req, res, next) => {
  let template_id = ObjectId(req.params.template_id);
  db.approval.auto.findOne({
    _id: template_id
  })
  .then(template => {
    if (template) {
      return res.json(template);
    }
    return db.approval.template.findOne({
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
    });
  })
  .catch(next);
});

api.put('/:template_id/status', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  let data = req.body;
  let template_id = ObjectId(req.params.template_id);
  sanitizeValidateObject(statusSanitization, statusValidation, data);
  db.approval.auto.findOne({
    _id: template_id
  })
  .then(doc => {
    if (!doc) {
      return db.approval.template.findOneAndUpdate({
        _id: template_id,
        company_id: req.company._id,
        status: {
          $ne: C.APPROVAL_STATUS.DELETED
        }
      }, {
        $set: data
      }, {
        returnOriginal: false,
        returnNewDocument: true
      })
      .then(doc => {
        res.json(doc.value);
        if (!doc.ok) {
          return;
        }
        if (doc.value.status == C.APPROVAL_STATUS.UNUSED) {
          addActivity(req, C.ACTIVITY_ACTION.DISABLE_APPROVAL_TPL, {
            approval_template: template_id
          });
          return Approval.cancelItemsUseTemplate(req, template_id, C.ACTIVITY_ACTION.UPDATE);
        } else {
          return addActivity(req, C.ACTIVITY_ACTION.ENABLE_APPROVAL_TPL, {
            approval_template: template_id
          });
        }
      });
    } else {
      return Promise.map(doc.templates, tpl => {
        return db.approval.template.update({
          _id: tpl.template_id
        }, {
          $set: data
        });
      })
      .then(() => {
        return db.approval.auto.findOneAndUpdate({
          _id: template_id
        }, {
          $set: data
        }, {
          returnOriginal: false,
          returnNewDocument: true
        })
        .then(auto => {
          res.json(auto.value);
        });
      });
    }
  })
  .catch(next);
});

api.delete('/:template_id', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  let template_id = ObjectId(req.params.template_id);
  db.approval.auto.findOne({
    _id: template_id
  })
  .then(doc => {
    if (!doc) {
      db.approval.template.findAndModify({
        query: {
          _id: template_id,
          company_id: req.company._id,
          for: {
            $exists: false
          }
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
      .then(() => res.json({}));
    } else {

      return Promise.map(doc.templates, tpl => {
        return db.approval.template.findOneAndUpdate({
          _id: tpl.template_id
        }, {
          $set: {
            status: C.APPROVAL_STATUS.DELETED
          }
        }, {
          returnOriginal: false,
          returnNewDocument: true
        }).then(doc => {
          return db.approval.template.master.update({
            _id: doc.value.master_id
          }, {
            $set: {
              status: C.APPROVAL_STATUS.DELETED
            }
          });
        });
      })
      .then(() => {
        return db.approval.auto.findOneAndUpdate({
          _id: template_id
        }, {
          $set: {
            status: C.APPROVAL_STATUS.DELETED
          }
        }, {
          returnOriginal: false,
          returnNewDocument: true
        })
        .then(auto => {
          res.json(auto.value);
        });
      });
    }
  })
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
