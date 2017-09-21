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


  rpc.route('/activity/draw/redpacket', { user_id: user._id, ...req.body }, data => {
    if (data.code === 200) return res.json(data.data);

    res.status(data.code).json(data);
  });
});
