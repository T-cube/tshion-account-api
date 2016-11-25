import express from 'express';

import Auth from 'models/plan/auth';


let api = express.Router();

export default api;


api.get('/', (req, res, next) => {

});

api.post('/', (req, res, next) => {
  let auth = new Auth(req.company._id);
  auth.create(req.body);
  
});

api.put('/', (req, res, next) => {

});

api.put('/status', (req, res, next) => {

});
