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
    'approval.template.master',
    'approval.user',
    'attendance.setting',
    'attendance.sign',
    'attendance.audit',
    'attendance.record',
    'auth_check_token',
    'company',
    'discussion',
    'discussion.comment',
    'document.dir',
    'document.file',
    'document.token',
    'notification',
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
    'user.confirm.email',
    'user.confirm.mobile',
    'wiki',
  ]);
}
