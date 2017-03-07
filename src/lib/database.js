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
  'preference',
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
  'weather.area',
  'wechat.location',
  'wechat.oauth',
  'wechat.user',
  'wiki',

  // plan
  'user.realname',

  'ids',                      // id 自增
  'qrcode',
  'qrcode.scan',

  // payment & plan
  'plan',
  'plan.auth',
  'plan.auth.pic',
  'plan.company',
  'plan.degrade',
  'payment.product',
  'payment.token',
  'payment.discount',
  'payment.coupon',
  'payment.coupon.item',
  'payment.company.coupon',
  'payment.recharge',
  'payment.order',
  'payment.recharge.discount',
  'payment.charge.order',
  'payment.address',
  'payment.invoice',
  'payment.product.history',
  'payment.balance',
  'payment.transaction.log',

  // transaction
  'transaction',
  'temp.file',
];

const dbConfig = config.get('database');

let db = pmongo(dbConfig, collections);

export default db;
