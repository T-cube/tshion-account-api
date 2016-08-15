import express from 'express';

let api = express.Router();
export default api;

api.get('/', (req, res, next) => {
  let companyId = req.company._id;
  let { last_id } = req.query;
  req.model('activity').fetch({
    company: companyId,
  }, last_id)
  .then(list => res.json(list))
  .catch(next);
});
