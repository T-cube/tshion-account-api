import express from 'express';

// import { sanitizeValidateObject } from 'lib/inspector';
// import { infoSanitization, infoValidation, avatarSanitization, avatarValidation } from './schema';

/* users collection */
let api = express.Router();
export default api;

api.get('/', (req, res, next) => {
  let companyId = req.company._id;
  let { last_id } = req.params;
  req.model('activity').fetch({
    company: companyId,
  }, last_id)
  .then(list => res.json(list))
  .catch(next);
});
