#!/usr/bin/env node
import { ObjectId } from 'mongodb';
import _ from 'underscore';

import '../bootstrap';
import program from 'commander';
import db from 'lib/database';
import Structure from 'models/structure';
import { indexObjectId } from 'lib/utils';

program
  .option('-m, --cleanmember', 'remove member position when position not exists')
  .parse(process.argv);

console.log('update member position');

if (!program.cleanmember) {
  program.outputHelp();
}

if (program.cleanmember) {

  cleanmember()
  .then(() => {
    console.log('update success!');
    process.exit();
  })
  .catch(e => {
    console.error(e);
    process.exit();
  });

}

function cleanmember(last_id) {
  let pagesize = 100;
  return fetchCompanies(pagesize, last_id)
  .then(companies => {
    companies.forEach(company => {
      let { structure } = company;
      if (updateStructer(structure)) {
        console.log(`update company ${company.name}`);
        db.company.update({
          _id: company._id
        }, {
          $set: {structure}
        });
      }
    });
    if (companies.length == pagesize) {
      let last_id = companies[pagesize - 1]._id;
      return cleanmember(last_id);
    }
  });
}

function updateStructer(node) {
  let { positions, members, children } = node;
  let positionIds = _.pluck(positions, '_id');
  let updated = false;
  node.members = _.filter(members, m => {
    if (indexObjectId(positionIds, m.position) > -1) {
      return true;
    }
    updated = true;
    return false;
  });
  if (children && children.length) {
    children.forEach(child => {
      if (updateStructer(child)) {
        updated = true;
      }
    });
  }
  return updated;
}

function fetchCompanies(pagesize, last_id) {
  let criteria = {};
  if (last_id) {
    criteria._id = {
      _id: {
        $gt: last_id
      }
    };
  }
  return db.company.find(criteria, {
    structure: 1,
    name: 1
  })
  .limit(pagesize)
  .sort({
    _id: 1
  });
}
