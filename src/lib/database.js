import pmongo from 'pmongo';
import config from 'config';

export { ObjectId } from 'mongodb';

export function database() {
  let dbConfig = config.get('database');
  return pmongo(dbConfig, [
    'announcement',
    'approval.approve',
    'approval.copyto',
    'approval.flow',
    'approval.template',
    'approval.user',
    'approval.item',
    'auth_check_token',
    'company',
    'document.dir',
    'document.file',
    'message',
    'oauth.clients',
    'oauth.accesstoken',
    'oauth.refreshtoken',
    'project',
    'project.tags',
    'request',
    'task',
    'task.comments',
    'task.log',
    'user',
    'wiki',
  ]);
}
