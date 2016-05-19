import pmongo from 'pmongo';
import config from 'config';

export { ObjectId } from 'mongodb';

export function database() {
  let dbConfig = config.get('database');
  return pmongo(dbConfig, [
    'announcement',
    'activity',
    'approval.approve',
    'approval.copyto',
    'approval.flow',
    'approval.template',
    'approval.user',
    'approval.item',
    'attendance',
    'auth_check_token',
    'company',
    'document.dir',
    'document.file',
    'document.token',
    'discussion',
    'discussion.comment',
    'message',
    'oauth.clients',
    'oauth.accesstoken',
    'oauth.refreshtoken',
    'project',
    'project.tags',
    'request',
    'task',
    'task.comments',
    'task.activity',
    'user',
    'wiki',
  ]);
}
