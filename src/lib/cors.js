import config from 'config';
import cors from 'cors';

const allowedOrigins = config.get('allowedOrigins');

const CORS_CONFIG = {
  origin : allowedOrigins,
  methods : 'GET,POST,PUT,DELETE,OPTIONS',
  allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization',
  credentials: true,
};

export default cors(CORS_CONFIG);
