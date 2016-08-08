#!/usr/bin/env node

import '../bootstrap';
import program from 'commander';
import wUtil from 'lib/wechat-util.js';

program
  .option('-o, --create', 'create wechat menu')
  .parse(process.argv);

console.log('creating wechat menu');

if (!program.create) {
  program.outputHelp();
}

if (program.create) {

  wUtil.createMenu({
    'button': [{
      'type':'view',
      'name':'工作台',
      'url':'https://m.tlifang.com/oa/company'
    }, {
      'type':'view',
      'name':'帮助手册',
      'url':'https://www.tlifang.com/weixin-guide'
    }, {
      'type':'click',
      'name':'联系客服',
      'key':'contact_us'
    }]
  }, function(e, result) {
    console.log('e', e);
    console.log('result', result);
    process.exit();
  });

}
