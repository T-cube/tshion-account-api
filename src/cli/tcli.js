#!/usr/bin/env node

import '../bootstrap';
import program from 'commander';

program
  .version('0.0.1')
  .command('initdb', 'init data after install')
  .parse(process.argv);

console.log('TLifang API Command Line Tool');
console.log('--------------------------------------------------------------------------------');
