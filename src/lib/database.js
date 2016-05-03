import pmongo from 'pmongo';
import config from 'config';

export { ObjectId } from 'mongodb';

export function database() {
  let dbConfig = config.get('database');
  return pmongo(dbConfig, [
    'announcement',
    'auth_check_token',
    'company',
    'oauth_clients',
    'oauth_accesstoken',
    'oauth_refreshtoken',
    'project',
    'request',
    'task',
    'task.comments',
    'task.log',
    'approval',
    'user',
    'user.approval',
  ]);
}
