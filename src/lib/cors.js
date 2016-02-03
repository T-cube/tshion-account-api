export default (req, res, next) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'HEAD,GET,POST,PUT,DELETE,OPTIONS'
  });
  if (req.method == 'OPTIONS') {
    res.send();
  } else {
    next();
  }
}
