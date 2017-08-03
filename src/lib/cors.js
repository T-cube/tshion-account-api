import config from 'config';

const allowedOrigins = config.get('allowedOrigins');

export default function cors(req,res,next){
  let _origin = req.headers.origin,
    can_next = ~allowedOrigins.indexOf(_origin),
    Credentials = true;
  if(allowedOrigins==='*'){
    can_next = true;
    Credentials = false;
    _origin ='*';
  }
  res.set('Access-Control-Allow-Origin', _origin);
  res.set('Access-Control-Allow-Credentials',  Credentials);
  res.set('Access-Control-Allow-Methods',  'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');

  if(can_next){
    next();
  }else{
    res.set('Content-Length' , 0);
    res.status(204).end();
  }
}
