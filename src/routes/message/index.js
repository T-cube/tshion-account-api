import express from 'express'
import { ObjectId } from 'mongodb';

import { ApiError } from 'lib/error';
import { oauthCheck } from 'lib/middleware';

let api = express.Router();
export default api;

api.use(oauthCheck());

api.get('/', (req, res, next) => {
  db.message.find({
    to: req.user._id,
  })
  .then(list => res.json(list))
  .catch(next);
});

api.get('/unread', (req, res, next) => {
  db.message.find({
    to: req.user._id,
    is_read: false,
  })
  .then(list => res.json(list))
  .catch(next);
});

api.post('/:message_id/read', (req, res, next) => {
  let messageId = ObjectId(req.params.message_id);
  db.message.findOneAndUpdate({
    _id: messageId,
    to: req.user._id,
  }, {
    $set: {
      is_read: true,
    }
  })
  .then(() => res.json({}))
  .catch(next);
});
