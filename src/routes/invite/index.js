import config from 'config';

let api = require('express').Router();
export default api;

api.post('/', (req, res, next) => {
  let body = req.body;
  let qs = [];
  for(let key in body) {
    qs.push(`${key}=${body[key]}`);
  }
  let querystring = qs.join('&');
  let host = `${req['headers']['host']}/api/invite`;
  if (body.type == 'account') {
    host += '/account';
  } else if (body.type == 'company') {
    host += '/company';
  }
  let url = [host, encodeURIComponent(querystring)].join('?');
  res.json(url);
});

api.get('/:type', (req, res, next) => {
  let url;
  if (/micromessenger|ios|iphone|ipad|android|ucweb/.test(req['headers']['user-agent'].toLowerCase())) {
    url = config.get('mobile');
    if (req.params.type == 'account') {
      url += 'account/register';
    } else if (req.params.type == 'account') {
      url += 'oa/user/mine'
    }
  } else {
    
  }
});
