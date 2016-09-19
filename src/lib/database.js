import pmongo from 'pmongo';
import config from 'config';

export { ObjectId } from 'mongodb';

const collections = [
  'announcement',
  'activity',
  'approval.approve',
  'approval.copyto',
  'approval.export',
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
  'company.level',
  'company.member.old',
  'discussion',
  'discussion.comment',
  'document.dir',
  'document.file',
  'document.token',
  'notification',
  'oauth.accesstoken',
  'oauth.clients',
  'oauth.refreshtoken',
  'oauth.code',
  'project',
  'project.tags',
  'reminding',
  'request',
  'schedule',
  'short.url',
  'task',
  'task.comments',
  'user',
  'user.confirm.email',
  'user.confirm.mobile',
  'user.guide',
  'guide',
  'wechat.location',
  'wechat.oauth',
  'wechat.scan',
  'wechat.from',
  'wechat.user',
  'wiki',
];

const dbConfig = config.get('database');

let db = pmongo(dbConfig, collections);

export default db;
