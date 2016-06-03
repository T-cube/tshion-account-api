import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

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
  db.approval.template.master.find({
    company_id: req.company._id,
    status: {
      $ne: C.APPROVAL_STATUS.DELETED
    },
  }, {
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
      },
    };
    let user = req.user._id;
    if (user && ObjectId.isValid(user)) {
      let structure = new Structure(req.company.structure);
      condition.scope = {
        $in: structure.findMemberDepartments(ObjectId(user))
      };
    }
    return db.approval.template.find(condition, {
      name: 1,
      description: 1,
      scope: 1,
      status: 1,
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

api.post('/', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(sanitization, validation, data);
  data.steps.forEach(i => {
    i._id = ObjectId();
  });
  data.forms && data.forms.forEach(i => {
    i._id = ObjectId();
  });
  data.company_id = req.company._id;
  data.status = C.APPROVAL_STATUS.UNUSED;
  Approval.createTemplate(data)
  .then(template => {
    res.json(template);
    // return addActivity(req, C.ACTIVITY_ACTION.CREATE, {
    //   approval_template: template._id
    // });
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
  data.forms && data.forms.forEach(i => {
    i._id = ObjectId();
  });
  data.company_id = req.company._id;
  data.status = C.APPROVAL_STATUS.UNUSED;
  let condition = {
    _id: template_id,
    company_id: req.company._id,
    status: {
      $ne: C.APPROVAL_STATUS.DELETED
    }
  };
  db.approval.template.findOne(condition, {
    master_id: 1,
    status: 1,
  })
  .then(oldTpl => {
    if (!oldTpl) {
      throw new ApiError(404, null, 'template is not exist');
    }
    if (oldTpl.status != C.APPROVAL_STATUS.UNUSED) {
      throw new ApiError(400, null, '启用中的模板不能编辑');
    }
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
      cancelItemsUseTemplate(req, template_id, C.ACTIVITY_ACTION.UPDATE)
    ]);
  })
  // .then(() => addActivity(req, C.ACTIVITY_ACTION.UPDATE, {
  //   approval_template: template_id
  // }))
  .catch(next);
});

api.get('/:template_id', (req, res, next) => {
  let template_id = ObjectId(req.params.template_id);
  db.approval.template.findOne({
    _id: template_id,
    company_id: req.company._id,
    status: {
      $ne: C.APPROVAL_STATUS.DELETED
    }
  })
  .then(doc => {
    if (!doc) {
      throw new ApiError(404);
    }
    let tree = new Structure(req.company.structure);
    doc.scope = doc.scope.map(scope => _.pick(tree.findNodeById(scope), '_id', 'name'));
    res.json(doc);
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
      return cancelItemsUseTemplate(req, template_id, C.ACTIVITY_ACTION.UPDATE);
    } else {
      return addActivity(req, C.ACTIVITY_ACTION.UPDATE, {
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
        _id: template.master_id
      }, {
        $set: {
          status: C.APPROVAL_STATUS.DELETED
        }
      }),
      cancelItemsUseTemplate(req, template_id, C.ACTIVITY_ACTION.DELETE),
      addActivity(req, C.ACTIVITY_ACTION.DELETE, {
        approval_template: template_id
      })
    ]);
  })
  .then(() => res.json({}))
  .catch(next);
});

function cancelItemsUseTemplate(req, template_id) {
  return db.approval.item.find({
    template: template_id,
    status: C.APPROVAL_STATUS.NORMAL,
  }, {
    from: 1
  })
  .then(items => {
    let itemIdList = items.map(item => item._id);
    let notification = {
      action: C.ACTIVITY_ACTION.APPROVAL_TEMPLATE_CHANGED,
      target_type: C.OBJECT_TYPE.APPROVAL_ITEM,
      company: req.company._id,
      from: req.user._id,
    };
    return Promise.all(
      items.map(item => {
        req.model('notification').send(_.extend(notification, {
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
          status: C.APPROVAL_STATUS.TEMPLATE_CHNAGED,
          step: null,
        }
      }))
    );
  });
}

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
