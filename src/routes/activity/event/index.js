import express from 'express';

import { ApiError } from 'lib/error';

const api = express.Router();
export default api;

api.get('/status', function(req, res, next) {
  let rpc = req.model('clientRpc');
  rpc.route('/activity/event/status', req.query, function(data) {
    if (data.code === 200) return res.json(data.data);

    res.status(data.code).json(data);
  });
});

api.post('/draw', function(req, res, next) {
  let rpc = req.model('clientRpc');
  let user = req.user;

  if (!user.wechat || !user.wechat.openid) throw new ApiError(400, 'no_openid');

  rpc.route('/activity/draw/redpacket', { mobile: user.mobile, user_id: user._id, ...req.body, openid: user.wechat ? user.wechat.openid : null }, data => {
    if (data.code === 200) return res.json(data.data);

    res.status(data.code).json(data);
  });
});


api.post('/sign/pick', function(req, res, next) {
  let rpc = req.model('clientRpc');
  let user = req.user;
  let { activity_id, prize } = req.body;
  rpc.route('/activity/sign/pick', { activity_id, prize, user_id: user._id, openid: user.wechat ? user.wechat.openid : null }, data => {
    if (data.code === 200) return res.json(data.data);

    res.status(data.code).json(data);
  });
});


api.get('/user/log', (req, res, next) => {
  let rpc = req.model('clientRpc');
  let user = req.user;

  rpc.route('/activity/log/picklog', { activity_id: req.query.activity_id, user_id: user._id }, data => {
    if (data.code === 200) return res.json(data.data);

    res.status(data.code).json(data);
  });
});

api.get('/award/logs', (req, res, next) => {
  let rpc = req.model('clientRpc');

  rpc.route('/activity/log/award', { activity_id: req.query.activity_id }, data => {
    if (data.code === 200) return res.json(data.data);

    res.status(data.code).json(data);
  });
});
