#!/usr/bin/env node

import '../bootstrap';
import program from 'commander';
import db from 'lib/database';
import _ from 'underscore';
import Promise from 'bluebird';

program
  .option('-o, --update', 'update company storage')
  .parse(process.argv);

console.log('database updating');

if (!program.update) {
  program.outputHelp();
}

if (program.update) {

  db.company.find({}, {
    _id: 1
  })
  .then(companyList => {
    return Promise.map(companyList, companyInfo => {
      let company_id = companyInfo._id;
      let project_stroage = [];
      let knowledge_stroage = {};
      return db.document.file.aggregate(
        [{
          $match: { company_id }
        }, {
          $group: {
            _id: '$company_id',
            size: { $sum: '$size' },
          }
        }]
      )
      .then(data => knowledge_stroage = _.pick(data[0], 'size'))
      .then(() => {
        return db.project.find({company_id}, { _id: 1})
        .then(projects => {
          let projectIds = projects.map(project => project._id);
          return projectIds && db.document.file.aggregate(
            [{
              $match: {
                project_id: {
                  $in: projectIds
                }
              }
            }, {
              $group: {
                _id: '$project_id',
                size: { $sum: '$size' },
              }
            }]
          )
          .then(data => project_stroage = data);
        })
        .then(() => {
          knowledge_stroage = {
            size: parseFloat(knowledge_stroage.size) || 0
          };
          let size = knowledge_stroage.size + _.reduce(project_stroage.map(item => item.size), (memo, num) => (memo + num), 0);
          console.log(company_id, {
            file: {
              size,
              knowledge: knowledge_stroage,
              project: project_stroage
            }
          });
          return db.company.level.update({
            _id: company_id
          }, {
            $set: {
              file: {
                size,
                knowledge: knowledge_stroage,
                project: project_stroage
              }
            }
          }, {
            upsert: true
          });
        });
      });
    });
  })
  .then(() => process.exit())
  .catch(e => console.error(e));
}
