import config from 'config';
import cors from 'cors';

const allowedOrigins = config.get('allowedOrigins');

export default cors({
  origin: function(url,callback){
    let corsOptions;
    if (~allowedOrigins.indexOf(url)) {
      corsOptions = {
        origin: true
      };
    } else {
      corsOptions = {
        origin: false
      };
    }
    callback(null, corsOptions);
  },
  optionsSuccessStatus: 204
});
