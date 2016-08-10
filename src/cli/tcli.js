#!/usr/bin/env node

import '../bootstrap';
import program from 'commander';

program
  .version('0.0.1')
  .command('initdb', 'init data after install')
  .command('companystorage', 'update company storage statistics')
  .command('attendancesign', 'upgrade attendance data structure')
  .command('wechatmenu', 'update wechat menu')
  .parse(process.argv);

console.log('TLifang API Command Line Tool');
console.log('--------------------------------------------------------------------------------');
