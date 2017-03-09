#!/usr/bin/env node
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';

import config from 'config';
import '../bootstrap';
import program from 'commander';
import db from 'lib/database';
import approvalTemplate from './config/approval-template';
import { handleError } from './lib/utils';


function initOauthClients() {
  return db.oauth.clients.count({})
  .then(count => {
    if (count > 0 && !program.force) {
      throw new Error('oauth clients already exists, please use -f');
    }
    return db.oauth.clients.remove({})
    .then(() => {
      return db.oauth.clients.insert([
        {
          client_id: 'com_tlifang_wcapp_attendance',
          client_secret: 'zEMbcbttwBSGbnU4mTNnJ23bJDsMYRTZ',
        },
        {
          client_id: 'com_tlifang_web',
          client_secret: 'C62dDqERqa78f7kUxTV8hQzY2ST7fGxG',
        },
        {
          client_id: 'com_tlifang_web_old',
          client_secret: '79C8AuGD4N3sCZwT6432vhc2BMSz8eCY',
        },
        {
          client_id: 'com_tlifang_mobile',
          client_secret: 'Af9a3535pqp5Z865gza452zWf3y3KPUR',
        },
        {
          client_id: 'com_tlifang_wechat',
          client_secret: 'Ck2NS44cDg2cs93U2Rs9KCdH33bd495m',
        },
        {
          client_id: 'com_tlifang_www',
          client_secret: 'E6t5273DDS3h3X8z8eeH3gG933M6ZAuM',
          redirect_uri: 'https://www.tlifang.com/user/oauth',
        },
      ]);
    });
  })
  .then(() => {
    console.log('oauth.clients updated.');
    return Promise.resolve();
  });
}

function initApprovalTemplate() {
  return db.approval.template.default.count({})
  .then(count => {
    if (count > 0 && !program.force) {
      throw new Error('approval template already exists, please use -f');
    }
    return db.approval.template.default.remove({})
    .then(() => {
      let templates = approvalTemplate.map(item => {
        item.forms.forEach(form => form._id = ObjectId());
        return item;
      });
      console.log(`${templates.length} templates will be inserting:`);
      return db.approval.template.default.insert(templates);
    });
  })
  .then(() => {
    console.log('approval.template.default inserted.');
    return Promise.resolve();
  });
}

program
  .option('-f, --force', 'force update, this will erase old data');

program
  .command('oauth-clients')
  .description('update oauth clients')
  .action(() => {
    initOauthClients()
    .then(() => {
      process.exit();
    })
    .catch(handleError);
  });

program
  .command('approval-template')
  .description('update approval default templates')
  .action(() => {
    initApprovalTemplate()
    .then(() => {
      process.exit();
    })
    .catch(handleError);
  });

program
  .command('all')
  .description('update approval default templates')
  .action(() => {
    Promise.map([
      initOauthClients,
      initApprovalTemplate,
    ], func => func())
    .then(() => {
      process.exit();
    })
    .catch(handleError);
  });

program.parse(process.argv);

if (program.args.length == 0) {
  program.help();
}

console.log('database connected to:', config.database);
