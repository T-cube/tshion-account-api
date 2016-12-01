#!/usr/bin/env node

import xlsx from 'node-xlsx';
import '../bootstrap';

import fs from 'fs';

import db from 'lib/database';

const workSheetsFromBuffer = xlsx.parse(fs.readFileSync(`${__dirname}/weather_areaid.xlsx`));

const data = workSheetsFromBuffer[0].data;

let row = data.shift();

let arr = data.map(item => {
  let rs = {};
  item.forEach((value, index) => {
    rs[row[index].toLowerCase()] = value;
  });
  return rs;
});

let count = arr.length;


function checkCount() {
  count--;
  count == 0 && (console.log('finished'), process.exit());
}
arr.forEach(item => {
  db.weather.area.findOne({ areaid: item.areaid }).then(doc => {
    if (doc) { console.log(doc); return checkCount(); }

    db.weather.area.insertOne(item).then(result => {
      checkCount();
    }).catch(e => {
      console.log(e);
      checkCount();
    });
  }).catch(e => {
    console.log(e);
    checkCount();
  });
});
// fs.writeFileSync(`${__dirname}/weather_areaid2.json`,JSON.stringify(data).replace(/\]\,/g,'],\n'));



// console.log(arr);
