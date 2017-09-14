import express from 'express';

import { oauthCheck } from 'lib/middleware';

const api = express.Router();
export default api;
api.use(oauthCheck());

api.use('/event',require('./event').default);
api.use('/handler',require('./handler').default);