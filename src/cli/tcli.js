#!/usr/bin/env node

import '../bootstrap';
import program from 'commander';

program
  .version('0.0.1')
  .command('db', 'dump & restore db')
  .command('initdb', 'init data after install')
  .command('companylevel', 'update company level statistics')
  .command('attendancesign', 'upgrade attendance data structure')
  .command('wechatmenu', 'update wechat menu')
  .command('cdnupgrade', 'upload local files to qiniu cdn & update database')
  .command('cdnmkdir', 'mkdir uuid dir')
  .command('cdnmkdir', 'separate uploaded files into directories')
  .command('filecdnkey', 'add cdn key to document file')
  .command('approvalversion', 'update approval template version status')
  .command('position', 'update member position')
  .command('notification', 'set default notification')
  .command('plan', 'init plan')
  .command('product', 'init product')
  .command('preference', 'reset preference')
  .command('announcement', 'update announcement description')
  .command('config', 'config utils')
  .parse(process.argv);

// console.log('TLifang API Command Line Tool');
// console.log('--------------------------------------------------------------------------------');
