import _ from 'underscore';

import { ApiError } from 'lib/error';
import C from 'lib/constants';

export default class Approval {

  constructor() {}

  static createItem(data) {
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
      data.forms.forEach(form => {
        form.title = (_.find(template.forms, tpl_form => tpl_form._id.equals(form._id))).title;
      });
      return db.approval.item.insert(data)
      .then(doc => {
        res.json(doc);
        let item_id = doc._id;
        return db.approval.user.findOne({
          _id: user_id,
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
                _id: user_id,
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
          return prepareNextStep(req.company, item_id, template._id, data.step)
        })
      })
    })
  }
}
