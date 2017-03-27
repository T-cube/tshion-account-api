#!/usr/bin/env node
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import xlsx from 'node-xlsx';
import fs from 'fs';

import config from 'config';
import '../bootstrap';
import program from 'commander';
import db from 'lib/database';
import approvalTemplate from './config/approval-template';
import planData from './config/plan';
import oauthClient from './config/oauth-clients';
import { handleError } from './lib/utils';


function initOauthClients() {
  return db.oauth.clients.count({})
  .then(count => {
    if (count > 0 && !program.force) {
      throw new Error('oauth clients already exists, please use -f');
    }
    return db.oauth.clients.remove({})
    .then(() => {
      return db.oauth.clients.insert(oauthClient);
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

function initPlan() {
  return db.plan.count({})
  .then(count => {
    if (count > 0 && !program.force) {
      throw new Error('plan already exists, please use -f');
    }
    return db.plan.remove({})
    .then(() => {
      return db.plan.insert(planData)
      .then(() => {
        console.log('plan import succeed');
      });
    });
  });
}

function initWeatherArea() {
  return db.weather.area.count({}).then(count => {
    if (count > 0 && !program.force) {
      throw new Error('weather area already exists, please use -f');
    }
    let dir = `${__dirname}/../../design/data/weather_areaid.xlsx`;
    const workSheetsFromBuffer = xlsx.parse(fs.readFileSync(dir));
    const data = workSheetsFromBuffer[0].data;
    let row = data.shift();
    let arr = data.map(item => {
      let rs = {};
      item.forEach((value, index) => {
        rs[row[index].toLowerCase()] = value;
      });
      return rs;
    });
    fs.writeFileSync(dir.replace(/\.xlsx$/,'.json'), JSON.stringify(arr, null, 2));
    return db.weather.area.remove({}).then(() => {
      return db.weather.area.insert(arr).then(doc => {
        console.log(`weather area: ${doc.length} records inserted!`);
      });
    });
  });
}

program
  .option('-f, --force', 'force update, this will erase old data');

program
  .command('weather-area')
  .description('translate xlsx to json')
  .action(() => {
    initWeatherArea()
    .then(() => {
      process.exit(0);
    })
    .catch(handleError);
  });

program
  .command('plan')
  .description('init plan')
  .action(() => {
    initPlan()
    .then(() => {
      process.exit(0);
    })
    .catch(handleError);
  });

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
      initPlan,
      initWeatherArea
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
