import _ from 'underscore';
import Promise from 'bluebird';

import express from 'express';
import { ObjectId } from 'mongodb';
import { ApiError } from '../../lib/error';

let api = express.Router();

export default api;

// prepare user data
api.use('/', (req, res, next) => {
  // TODO fake data to be replaced by oauth user
  let user_id = ObjectId("56ac7bdbac57dfabe93456ae");
  db.user.findOne({_id: user_id})
  .then(data => {
    if (!data) {
      throw new ApiError(403);
    }
    req.user = data;
    next();
  }).catch(next);
});

// get all contacts of current user
api.get('/contacts', (req, res, next) => {
  let contacts = req.user.contacts;
  if (!contacts) {
    return res.json([]);
  }
  let user_ids = _.map(contacts, u => u._id);
  db.user.find({_id: {$in: user_ids}}, {name: 1, avatar: 1})
  .then(list => {
    let _list = _.map(list, user => {
      let _user = _.find(contacts, u => {
        return u._id.equals(user._id);
      });
      user.nickname = _user.nickname;
      return user;
    });
    res.json(_list);
  });
});

// remove a relationship to a user
api.delete('/contacts/:user_id', (req, res, next) => {
  let user_id = ObjectId(req.params.user_id);
  let contacts = req.user.contacts;
  let index = _.findIndex(contacts, user => user_id.equals(user._id));
  if (index < 0) {
    return res.json(0);
  }
  db.user.update( { _id: req.user._id }, {
    $pull: { contacts: { _id: user_id }}
  })
  .then(result => res.json(result))
  .catch(next);
});

// get user joined groups
api.get('/groups', (req, res, next) => {
  let groups = req.user.groups || [];
  res.json(groups);
});

// get user talks
api.get('/talks', (req, res, next) => {
  let groups = data.groups || [];
  res.json(groups);
});

// get relation requests
api.get('/requests', (req, res, next) => {
  db.relation_requests.find({ to: req.user._id }).sort({up_time: -1})
  .then(list => res.json(list))
  .catch(next);
});

// before adding a persion as a friend, need to search it with username
api.get('/friend/search/:username', (req, res, next) => {
  let username = req.params.username;
  db.user.find({$or: [ {username}, {mobile: username} ]}, {username: 1, avatar: 1})
  .then(list => res.json(list))
  .catch(next);
});

// sending friend relationship request
api.post('/friend/request', (req, res, next) => {
  let user_id = ObjectId(req.body.user_id);
  let message = req.body.message;
  let now = new Date();
  var data = {
    from: req.user._id,
    to: user_id,
    type: "request",
    object: "friend",
    rel_id: user_id,   // request object _id
    message: req.body.message,
    add_time: now,
    up_time: now,
    is_read: false,
    accepted: 0
  }
  db.relation_requests.insert(data)
  .then(result => res.json(result))
  .catch(next);
});

// invite persion to join a group
api.post('/group/invite', (req, res, next) => {
  let group_id = ObjectId(req.body.group_id);
  let user_id = ObjectId(req.body.user_id);
  let message = req.body.message;
  let now = new Date();
  var data = {
    from: req.user._id,     // _id the request send from
    to: user_id,       // _id the user he/she wants to add
    type: "invite",
    object: "group",
    rel_id: group_id,   // request object _id
    message: req.body.message,
    add_time: now,
    up_time: now,
    is_read: false,
    accepted: 0
  }
  db.relation_requests.insert(data)
  .then(result => res.json(result))
  .catch(next);
});

// send request to join a group
api.post('/group/request', (req, res, next) => {
  let group_id = ObjectId(req.body.group_id);
  let user_id = ObjectId(req.body.user_id);
  let message = req.body.message;
  let now = new Date();
  var data = {
    from: req.user._id,     // _id the request send from
    to: user_id,       // _id the user he/she wants to add
    type: "invite",
    object: "group",
    rel_id: group_id,   // request object _id
    message: req.body.message,
    add_time: now,
    up_time: now,
    is_read: false,
    accepted: 0
  }
  db.relation_requests.insert(data)
  .then(result => res.json(result))
  .catch(next);
});

// accept a request, and build relationship
api.post('/requests/:request_id/accept', (req, res, next) => {
  let request_id = ObjectId(req.params.request_id);
  db.relation_requests.findOne({
    _id: request_id,
    to: req.user._id,
    rejected: 0
  })
  .then(request => {
    if (!request) {
      throw new ApiError(404)
    } else if (request.accepted !== null) {
      throw new ApiError(400, 'already_set')
    }
    if (request.type == 'request' && request.object == 'friend') {
      // add friend relationship to each other
      var operations = _([
        {a: request.from, b: request.to},
        {a: request.to, b: request.from}
      ])
      .map((id) => db.user.update({
          _id: id.a
        }, {
          $addToSet: { contacts: {
            _id: id.b,
            nickname: null
          }}
        })
      );
      return Promise.all(operations);
    } else if (request.type == 'request' && request.object == 'group') {
      // add user to a group
      let p1 = db.user.update({
        _id: request.to
      }, {
        $addToSet: { groups: request.rel_id }
      });
      let p2 = db.groups.update({
        _id: request.rel_id
      }, {
        $addToSet: { users: {
          _id: request.to,
          nickname: req.user.name
        }}
      })
      return Promise.all([p1, p2]);
    } else {
      // TODO handle other type of request
      return Promise.resolve(true);
    }
  })
  .then(() => {
    return db.relation_requests.update({ _id: request_id}, {
      $currentDate: { up_time: true },
      $set: { accepted: 1 }
    })
  })
  .then(result => res.json(result))
});

// reject a request
api.post('/requests/:request_id/reject', (req, res, next) => {
  let request_id = ObjectId(req.params.request_id);
  db.relation_requests.findOne({
    _id: request_id,
    to: req.user._id
  })
  .then(request => {
    if (!request) {
      throw new ApiError(404)
    } else if (request.accepted !== null) {
      throw new ApiError(400, 'already_set')
    }
    return db.relation_requests.update({ _id: request_id}, {
      $currentDate: { up_time: true },
      $set: { accepted: -1 }
    })
  })
  .then(result => res.json(result))
})

api.post('', (req, res, next) => {

})
