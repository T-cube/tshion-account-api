#!/usr/bin/env node
import fs from 'fs';
import _ from 'underscore';

import '../bootstrap';
import program from 'commander';

const CONFIG_FILE = 'config/default.js';
const ENV_FILE = '.env';
const ENV_TEMPLATE_FILE = '.env-template';

function readConfig() {
  const pattern = /^(\w+)=(.+)$/;
  let config = [];
  if (!fs.existsSync(ENV_FILE)) {
    return config;
  }
  let content = fs.readFileSync(ENV_FILE, {encoding: 'utf-8'});
  let lines = content.split('\n');
  _.each(lines, line => {
    let result = pattern.exec(line);
    if (result) {
      if (_.findWhere(config, {key: result[1]})) {
        return;
      }
      config.push({
        key: result[1],
        value: result[2],
      });
    }
  });
  return config;
}

function writeConfig(config) {
  const pattern = /^(\w+)=(.+)$/;
  let groups = _.groupBy(config, item => item.key.replace(/\_.+$/, ''));
  let content = '';
  _.each(groups, (items, group) => {
    content += `# ${group}\n`;
    _.each(items, item => {
      content += `${item.key}=${item.value}\n`;
    });
    content += '\n';
  });
  fs.writeFileSync(ENV_FILE, content);
}

function extractConfigKeys() {
  let content = fs.readFileSync(CONFIG_FILE, {encoding: 'utf-8'});
  let keys = [];
  let pattern = /process\.env\.([A-Z]\w+)/g;
  let match = pattern.exec(content);
  while (match) {
    keys.push(match[1]);
    match = pattern.exec(content);
  }
  return keys;
}

function writeEnvConfigFile(groups) {
  let content = '';
  _.each(groups, (keys, group) => {
    content += `# ${group}\n`;
    _.each(keys, key => {
      content += `${key}=\n`;
    });
    content += '\n';
  });
  fs.writeFileSync(ENV_TEMPLATE_FILE, content);
  console.log(`config template updated to ${ENV_TEMPLATE_FILE}`);
}

program
  .command('update-template')
  .description('update config template from default config')
  .action(() => {
    let keys = extractConfigKeys();
    let groups = _.groupBy(keys, key => key.replace(/\_.+$/, ''));
    writeEnvConfigFile(groups);
  });

program
  .command('update')
  .description('sync .env with config')
  .action(() => {
    let config = readConfig();
    let currentKeys = _.pluck(config, 'key');
    let keys = extractConfigKeys();
    let newKeys = [];
    _.each(keys, key => {
      if (!_.contains(currentKeys, key)) {
        newKeys.push(key);
        config.push({key, value: ''});
      }
    });
    writeConfig(config);
    console.log(`new config items ${newKeys.join(',')} added`);
  });

program
  .command('getall')
  .description('print all config values')
  .action(() => {
    let config = readConfig();
    _.each(config, item => {
      console.log(`${item.key}=${item.value}`);
    });
  });

program
  .command('get <key>')
  .description('get config value')
  .action(key => {
    let config = readConfig();
    let item = _.findWhere(config, {key: key});
    let value = item ? item.value : null;
    console.log(value);
  });

program
  .command('set <key> <value>')
  .description('set config value')
  .action((key, value) => {
    if (value == null) {
      value = '';
    }
    let config = readConfig();
    let item = _.findWhere(config, {key: key});
    if (item) {
      item.value = value;
    } else {
      config.push({key, value});
    }
    writeConfig(config);
    console.log('ok');
  });

program.parse(process.argv);
