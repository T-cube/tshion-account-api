#!/usr/bin/env node

import xlsx from 'node-xlsx';
import '../bootstrap';

import fs from 'fs';

import db from 'lib/database';

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

let count = arr.length;


function checkCount() {
  console.log(count);
  count--;
  count == 0 && (console.log('finished'), process.exit());
}


fs.writeFileSync(dir.replace(/\.xlsx$/,'.json'), JSON.stringify(arr).replace(/\]\,/g, '],\n'));


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

