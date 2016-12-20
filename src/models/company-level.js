import _ from 'underscore';
import { ObjectId } from 'mongodb';

import C from 'lib/constants';
import db from 'lib/database';
import { indexObjectId } from 'lib/utils';
import Plan from 'models/plan/plan';

export default class CompanyLevel {

  constructor(company_id) {
    if (!company_id || !ObjectId.isValid(company_id)) {
      throw new Error('invalid company_id');
    }
    this.company_id = company_id;
  }

  canUpload(size) {
    let total_size;
    if (_.isArray(size)) {
      total_size = _.reduce(size, (memo, num) => (memo + num), 0);
    } else {
      total_size = size;
      size = [size];
    }
    return this.getStatus().then(status => {
      let {levelInfo} = status;
      let {store_max_total_size, store_max_file_size} = levelInfo.file;
      for (let i in size) {
        if (size[i] > store_max_file_size) {
          return {
            ok: 0,
            code: C.LEVEL_ERROR.OVER_STORE_MAX_FILE_SIZE,
          };
        }
      }
      if ((levelInfo.file.size + total_size) > store_max_total_size) {
        return {
          ok: 0,
          code: C.LEVEL_ERROR.OVER_STORE_MAX_TOTAL_SIZE,
        };
      }
      return {
        ok: 1
      };
    });
  }

  canAddMember() {
    return this.getStatus().then(status => {
      let {setting, planInfo, levelInfo} = status;
      return levelInfo.member.count < (setting.max_member + planInfo.member_count);
    });
  }

  getStatus() {
    let { company_id, status } = this;
    if (status) {
      return Promise.resolve(status);
    }
    let planModel = new Plan(company_id);
    return Promise.all([
      planModel.getCurrent().then(planInfo => {
        return db.plan.findOne({type: planInfo.plan})
        .then(setting => {
          return {
            setting,
            planInfo,
          };
        });
      }),
      db.company.level.findOne({
        _id: company_id
      })
    ])
    .then(([{setting, planInfo}, levelInfo]) => {
      let {max_file_size, store, inc_member_store} = setting;
      planInfo.member_count = planInfo.member_count || 0;
      _.extend(levelInfo.file, {
        store_max_file_size: max_file_size,
        store_max_total_size: store + planInfo.member_count * inc_member_store,
      });
      this.status = {setting, planInfo, levelInfo};
      return this.status;
    });
  }

  updateUpload(args) {
    let { company_id } = this;
    let { size, target_type, target_id } = args;
    target_id = ObjectId(target_id);
    if (!size) {
      return Promise.resolve(true);
    }
    return this.getStatus().then(status => {
      let {levelInfo} = status;
      if (!target_type || !target_id) {
        throw new Error('missing target_type or target_id');
      }
      if (target_type == 'knowledge') {
        return db.company.level.update({
          _id: company_id,
        }, {
          $inc: {
            'file.size': size,
            [`file.${target_type}.size`]: size
          }
        });
      }

      if (levelInfo.file[target_type]) {
        let existItems = levelInfo.file[target_type].map(item => item._id);
        if (indexObjectId(existItems, target_id) > -1) {
          return db.company.level.update({
            _id: company_id,
            [`file.${target_type}._id`]: target_id
          }, {
            $inc: {
              'file.size': size,
              [`file.${target_type}.$.size`]: size
            }
          });
        }
      }

      if (size < 0) {
        return Promise.resolve(true);
      }

      return db.company.level.update({
        _id: company_id,
      }, {
        $push: {
          [`file.${target_type}`]: {
            _id: target_id,
            size: size
          }
        },
        $inc: {
          'file.size': size,
        }
      });
    });
  }

  static incMemberCount(company_id, count) {
    return db.company.level.update({
      _id: company_id
    }, {
      $inc: {
        'member.count': count
      }
    });
  }

  static init(company_id) {
    let info = {
      _id: company_id,
      member: {
        count: 1
      },
      file: {
        size: 0,
        knowledge: {
          size: 0
        },
        project: []
      }
    };
    return db.company.level.insert(info);
  }

}
