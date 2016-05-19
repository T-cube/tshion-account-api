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
    'approval.item',
    'approval.template',
    'approval.user',
    'attendance',
    'auth_check_token',
    'company',
    'discussion',
    'discussion.comment',
    'document.dir',
    'document.file',
    'document.token',
    'message',
    'oauth.accesstoken',
    'oauth.clients',
    'oauth.refreshtoken',
    'project',
    'project.tags',
    'reminding',
    'request',
    'schedule',
    'task',
    'task.comments',
    'user',
    'wiki',
  ]);
}
