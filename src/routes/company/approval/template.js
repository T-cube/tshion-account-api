import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';

import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import { sanitization, validation, statusSanitization, statusValidation } from './schema';
import C from 'lib/constants';
import { oauthCheck } from 'lib/middleware';
import Structure from 'models/structure';
import Approval from 'models/approval';

let api = require('express').Router();
export default api;

api.use(oauthCheck());

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
    let { scope } = req.query;
    scope && ObjectId.isValid(scope) && (condition.scope = ObjectId(scope));
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
    })
  })
  .catch(next);
});

api.post('/', (req, res, next) => {
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
  .then(template => res.json(template))
  .catch(next);
});

api.put('/:template_id', (req, res, next) => {
  let data = req.body;
  let template_id = ObjectId(req.params.template_id);
  sanitizeValidateObject(sanitization, validation, data);
  let condition = {
    _id: template_id,
    company_id: req.company._id,
    status: {
      $ne: C.APPROVAL_STATUS.DELETED
    }
  };
  db.approval.template.findOne(condition, {
    master_id: 1
  })
  .then(oldTpl => {
    if (!oldTpl) {
      throw new ApiError(404, null, 'template is not exist')
    }
    return Promise.all([
      db.approval.template.insert(data)
      .then(newTpl => {
        res.json(newTpl)
        return db.approval.template.master.update({
          _id: oldTpl.master_id
        }, {
          $set: {
            current: newTpl._id
          },
          $push: {
            reversions: newTpl._id
          }
        })
      }),
      cancelItemsUseTemplate(template_id)
    ])
  })
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
      throw new ApiError(404)
    }
    let tree = new Structure(req.company.structure);
    doc.scope = doc.scope.map(scope => tree.findNodeById(scope));
    res.json(doc)
  })
  .catch(next);
});

api.put('/:template_id/status', (req, res, next) => {
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
    res.json(doc)
    if (data.status == C.APPROVAL_STATUS.UNUSED) {
      return cancelItemsUseTemplate(template_id)
    }
  })
  .catch(next);
});

api.delete('/:template_id', (req, res, next) => {
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
      throw new ApiError(400, null, 'template is not exist')
    }
    return Promise.all([
      db.approval.template.master.update({
        _id: template.master_id
      }, {
        $set: {
          status: C.APPROVAL_STATUS.DELETED
        }
      }),
      cancelItemsUseTemplate(template_id)
    ])
  })
  .then(() => res.json({}))
  .catch(next);
});

function cancelItemsUseTemplate(template_id) {
  return db.approval.item.update({
    template: template_id,
    status: C.APPROVAL_STATUS.NORMAL,
  }, {
    $set: {
      status: C.APPROVAL_STATUS.TEMPLATE_CHNAGED,
      step: null,
    }
  })
}
