export default (req, res, next) => {
  res.set({
    'Access-Control-Allow-Origin' : '*',
    'Access-Control-Allow-Headers' : 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    'Access-Control-Allow-Methods' : 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': true,
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Accept-Encoding',
  });
  if (req.method == 'OPTIONS') {
    res.send();
  } else {
    next();
  }
};
