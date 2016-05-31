import pmongo from 'promised-mongo';
import config from 'config';
import _ from 'underscore';

export { ObjectId } from 'mongodb';

const collections = [
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
];

const dbConfig = config.get('database');

let db = pmongo(dbConfig, collections);

function extendPath(object, path, property) {
  let keys = path.split('.');
  console.log(keys);
  let length = keys.length;
  _.each(keys, (key, i) => {
    if (i < length - 1) {
      object[key] = {};
    } else {
      object[key] = property;
    }
    object = object[key];
  });
}
console.log(db);
//
// _.each(collections, name => {
//   const collection = db.collection(name);
//   extendPath(db, name, collection);
// });


export default db;
