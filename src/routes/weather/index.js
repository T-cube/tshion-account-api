import express from 'express';

// db.weather.area.createIndex({
//   'namecn': 1,
//   'nameen': 1,
// }).then(result => {
//   console.log(result);
// });

let api = express.Router();
export default api;

api.get('/:areaid', (req, res, next) => {
  let areaid = req.params.areaid;
  req.model('weather').getWeatherByAreaId(areaid, req.model('redis')).then(result => {
    res.json(result);
  }).catch(next);
});

api.get('/', (req, res, next) => {
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  ip = ip.replace(/\:\:f+\:/, '');
  // testip
  req.model('weather').getWeatherByIp(ip, req.model('redis')).then(result => {
    res.send(result);
  }).catch(next);
});

api.get('/keyword/:keyword', (req, res, next) => {
  let keyword = req.params.keyword;
  // res.json(weather.fuzzyQuery(keyword));
  req.model('weather').fuzzyQuery(keyword).then(docs => res.json(docs)).catch(next);
});
