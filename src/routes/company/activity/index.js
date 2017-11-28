import express from 'express';
import _ from 'underscore';

import db from 'lib/database';
import defaultAvatar from 'lib/upload';

const api = express.Router();
export default api;

api.get('/', (req, res, next) => {
  let companyId = req.company._id;
  let { last_id } = req.query;
  let members = req.company.members;
  req.model('activity').fetch({
    company: companyId,
  }, last_id, members)
  .then(list => res.json(list))
  .catch(next);
});
