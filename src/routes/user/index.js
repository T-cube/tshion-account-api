import express from 'express'
import { ApiError } from 'lib/error';
import { ObjectId } from 'mongodb';
import { oauthCheck } from 'lib/middleware';

import { sanitizeValidateObject } from 'lib/inspector';
import { infoSanitization, infoValidation, avatarSanitization, avatarValidation } from './schema';

/* users collection */
let api = express.Router();
export default api;

api.use(oauthCheck());

// api.route('/test')
// .get((req, res, next) =>  {
//   var data = {
//     accessToken:2,
//     uid:1,
//     expires:1
//   }
//   res.json(data);
// }).post((req, res, next) =>  {
//   // db.user.insert(req.body).then(doc =>  {
//   //   res.json(doc);
//   // }).catch(next);
//   res.json(req.body);
// });
//
// api.route('/')
// .get((req, res, next) => {
//   db.user.find().toArray().then(docs => res.json(docs)).catch(next);
// })
// .post((req, res, next) => {
//   db.user.insert(req.body).then(doc => res.json(doc)).catch(next);
// });
//
// //username,password,
//
// api.route('/:user_id')
// .get((req, res, next) =>  {
//   db.user.findOne({_id: pmongo.ObjectId(req.params.user_id)})
//   .then(doc =>  {
//     if (!doc) {
//       throw new ApiError(404);
//     }
//     res.json(doc);
//   }).catch(next);
// })
// .patch((req, res, next) =>  {
//   db.user.update({_id: pmongo.ObjectId(req.params.user_id)}, req.body)
//   .toArray()
//   .then(doc => res.json(doc)).catch(next);
// })
// .delete((req, res, next) =>  {
//   db.user.remove({_id: pmongo.ObjectId(req.params.user_id)})
//   .then(doc => res.json(doc)).catch(next);
// });

api.get('/info', (req, res, next) => {
  db.user.find({
    _id: req.user._id
  })
  .then(data => {
    res.json(data);
  });
});

api.put('/info', (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(infoSanitization, infoValidation, data);
  db.user.update({
    _id: req.user._id
  }, {
    $set: data
  })
  .then(result => js.json(result))
  .catch(next);
});

api.put('/avatar', (req, res, next) => {

});

api.get('/project', (req, res, next) =>  {
  db.user.findOne({
    _id: req.user._id
  }, {
    projects: 1
  }).then(userInfo => {
    if (!userInfo || typeof userInfo.projects != 'object' || !userInfo.projects.length) {
      return res.json([]);
    }
    let { company, type } = req.query;
    let condition = {
      _id: {$in: userInfo.projects}
    };
    if (company) {
      if (ObjectId.isValid(company)) {
        condition['company_id'] = ObjectId(company);
      } else {
        res.json([]);
      }
    }
    switch (type) {
      case 'archived':
        condition['is_archived'] = true;
        break;
      case 'mine':
        condition['owner'] = req.user._id;
      default:
        condition['is_archived'] = false;
    }
    db.project.find(condition)
    .then(data => res.json(data))
    .catch(next)
  })
  .catch(next)
});
