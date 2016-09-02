#!/usr/bin/env node

import '../bootstrap';
import program from 'commander';

program
  .version('0.0.1')
  .command('initdb', 'init data after install')
  .command('companystorage', 'update company storage statistics')
  .command('attendancesign', 'upgrade attendance data structure')
  .command('wechatmenu', 'update wechat menu')
  .command('cdnupgrade', 'upload local files to qiniu cdn & update database')
  .command('filecdnkey', 'add cdn key to document file')
  .parse(process.argv);

console.log('TLifang API Command Line Tool');
console.log('--------------------------------------------------------------------------------');
