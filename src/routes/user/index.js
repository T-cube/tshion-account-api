import express from 'express'
import pmongo from 'pmongo'
import { ApiError } from '../../lib/error';

/* users collection */
let api = express.Router();
export default api;

api.route('/test')
.get((req, res, next) =>  {
  var data = {
    accessToken:2,
    uid:1,
    expires:1
  }
  res.json(data);
}).post((req, res, next) =>  {
  // db.user.insert(req.body).then(doc =>  {
  //   res.json(doc);
  // }).catch(next);
  res.json(req.body);
});

api.route('/')
.get((req, res, next) => {
  db.user.find().toArray().then(docs => res.json(docs)).catch(next);
})
.post((req, res, next) => {
  db.user.insert(req.body).then(doc => res.json(doc)).catch(next);
});

//username,password,

api.route('/:user_id')
.get((req, res, next) =>  {
  db.user.findOne({_id: pmongo.ObjectId(req.params.user_id)})
  .then(doc =>  {
    if (!doc) {
      throw new ApiError(404);
    }
    res.json(doc);
  }).catch(next);
})
.patch((req, res, next) =>  {
  db.user.update({_id: pmongo.ObjectId(req.params.user_id)}, req.body)
  .toArray()
  .then(doc => res.json(doc)).catch(next);
})
.delete((req, res, next) =>  {
  db.user.remove({_id: pmongo.ObjectId(req.params.user_id)})
  .then(doc => res.json(doc)).catch(next);
});
