import pmongo from 'pmongo';
import config from 'config';

export { ObjectId } from 'mongodb';

export function database() {
  let dbConfig = config.get('database');
  return pmongo(dbConfig, [
    'oauth_clients',
    'oauth_accesstoken',
    'oauth_refreshtoken',
    'user',
    'company',
    'project',
    'task',
    'announcement',
    'project',
    'auth_check_token',
    'task',
    'task.comments',
    'task.log',
  ]);
}
