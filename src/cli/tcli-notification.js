#!/usr/bin/env node
import _ from 'underscore';

import '../bootstrap';
import program from 'commander';
import db from 'lib/database';
import NotificationSetting from 'models/notification-setting';

program
  .option('--reset', 'set user default notification setting')
  .parse(process.argv);

if (!program.reset) {
  program.outputHelp();
}

if (program.reset) {

  let notificationSetting = new NotificationSetting();
  notificationSetting.getAll().then(defaults => {
    let defaultSetting = {};
    _.map(defaults, (item, type) => {
      defaultSetting[type] = _.map(item, (v, method) => v.default && method).filter(i => i);
    });
    return db.user.find({}, {
      _id: 1
    })
    .then(users => {
      return Promise.all(users.map(user => {
        console.log(`reset user ${user._id}`);
        return db.notification.setting.insert(_.extend({}, user, defaultSetting));
      }));
    });
  })
  .then(() => {
    console.log('reseted.');
    process.exit();
  })
  .catch(e => {
    console.error(e);
  });


}
