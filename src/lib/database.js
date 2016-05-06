import pmongo from 'pmongo';
import config from 'config';

export { ObjectId } from 'mongodb';

export function database() {
  let dbConfig = config.get('database');
  return pmongo(dbConfig, [
    'announcement',
    'approval.approve',
    'approval.copyto',
    'approval.template',
    'approval.item',
    'auth_check_token',
    'company',
    'oauth.clients',
    'oauth.accesstoken',
    'oauth.refreshtoken',
    'project',
    'request',
    'task',
    'task.comments',
    'task.log',
    'user',
  ]);
}
