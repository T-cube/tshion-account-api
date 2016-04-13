import pmongo from 'pmongo';
import config from '../config';

export { ObjectId } from 'mongodb';

export function database() {
  return pmongo(config.db, [
    'oauth_clients',
    'oauth_accesstoken',
    'oauth_refreshtoken',
    'user',
    'company',
    'project',
    'task',
  ]);
}
