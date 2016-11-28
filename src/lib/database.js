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
  'approval.template.default',
  'approval.user',
  'attendance.setting',
  'attendance.sign',
  'attendance.audit',
  'attendance.record',
  'attendance.export',
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
  'notification.setting',
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
  'user.activity',
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

  // plan
  'plan.company',
  'plan.auth',
  'product',
  'product.discount',
  'payment.order',
  'payment.discount',
];

const dbConfig = config.get('database');

let db = pmongo(dbConfig, collections);

export default db;
