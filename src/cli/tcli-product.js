#!/usr/bin/env node
import { ObjectId } from 'mongodb';

import '../bootstrap';
import program from 'commander';
import db from 'lib/database';
import C from 'lib/constants';

program
  .option('--init', 'insert products')
  .parse(process.argv);

console.log('database initialization');

if (!program.init) {
  program.outputHelp();
}

if (program.init) {

  db.payment.product.remove({})
  .then(() => {
    return db.payment.product.insert([
      {
        title: '专业版',
        description: '',
        plan: C.TEAMPLAN.PRO,
        product_no: C.PRODUCT_NO.PLAN,
        product_id: C.TEAMPLAN.PRO.toUpperCase() + '_' + C.PRODUCT_NO.PLAN,
        original_price: '9900',
        discount: [],
        amount_min: null,
        amount_max: null,
        stock_total: null,
        stock_current: null,
        date_create: new Date(),
        date_update: new Date(),
      },
      {
        title: '企业版',
        description: '',
        plan: C.TEAMPLAN.ENT,
        product_no: C.PRODUCT_NO.PLAN,
        product_id: C.TEAMPLAN.ENT.toUpperCase() + '_' + C.PRODUCT_NO.PLAN,
        original_price: '19900',
        discount: [],
        amount_min: null,
        amount_max: null,
        stock_total: null,
        stock_current: null,
        date_create: new Date(),
        date_update: new Date(),
      },
      {
        title: '专业版人数续费',
        description: '',
        plan: C.TEAMPLAN.PRO,
        product_no: C.PRODUCT_NO.MEMBER,
        product_id: C.TEAMPLAN.PRO.toUpperCase() + '_' + C.PRODUCT_NO.MEMBER,
        original_price: '990',
        discount: [],
        amount_min: null,
        amount_max: null,
        stock_total: null,
        stock_current: null,
        date_create: new Date(),
        date_update: new Date(),
      },
      {
        title: '企业版人数续费',
        description: '',
        plan: C.TEAMPLAN.ENT,
        product_no: C.PRODUCT_NO.MEMBER,
        product_id: C.TEAMPLAN.ENT.toUpperCase() + '_' + C.PRODUCT_NO.MEMBER,
        original_price: '1990',
        discount: [],
        amount_min: null,
        amount_max: null,
        stock_total: null,
        stock_current: null,
        date_create: new Date(),
        date_update: new Date(),
      },
    ]);
  })
  .then(() => {
    console.log('payment.product inserted.');
    process.exit();
  });

}
