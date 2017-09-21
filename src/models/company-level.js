import _ from 'underscore';
import { ObjectId } from 'mongodb';

import C from 'lib/constants';
import db from 'lib/database';
import { findObjectIdIndex, mapObjectIdToData } from 'lib/utils';
import Plan from 'models/plan/plan';

import authConfig from 'models/plan/auth-config';

export default class CompanyLevel {

  constructor(company_id) {
    if (!company_id || !ObjectId.isValid(company_id)) {
      throw new Error('invalid company_id');
    }
    this.company_id = company_id;
    this.planModel = new Plan(company_id);
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
      let {levelInfo, planInfo} = status;
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
      if (planInfo.status == C.PLAN_STATUS.OVERDUE) {
        return {
          ok: 0,
          code: C.LEVEL_ERROR.PLAN_STATUS_UNEXPECTED
        };
      }
      return {
        ok: 1
      };
    });
  }

  canAddApprovalTemplete() {
    let _setting = null;
    return this.planModel.getCurrent().then(planInfo => {
      return this.planModel.getSetting(planInfo.plan);
    })
    .then(setting => {
      if (!setting) {
        return false;
      }
      _setting = setting;
      let masterQuery = {
        company_id: this.company_id,
        status: {
          $ne: C.APPROVAL_STATUS.DELETED
        },
      };
      return db.approval.template.master.find(masterQuery);
    })
    .then(masters => {
      masters = masters.map(master => master.current);
      if (!masters.length) {
        return true;
      } else {
        let condition = {
          _id: {
            $in: masters
          },
          status: {
            $ne: C.APPROVAL_STATUS.DELETED
          },
          for: {
            $ne: C.APPROVAL_TARGET.ATTENDANCE_AUDIT
          }
        };
        return db.approval.template.count(condition).then(total => {
          if (total >= _setting.max_approval_templete) {
            return false;
          }
          return true;
        });
      }
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
    return Promise.all([
      this.planModel.getCurrent()
      .then(planInfo => {
        return this.planModel.getSetting(planInfo.plan)
        .then(setting => {
          this.companyPlan = {
            setting,
            planInfo,
          };
          return this.companyPlan;
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

  getProgramLimits() {
    let { company_id } = this;
    return this.planModel.getCurrent().then(planInfo => {
      return db.company.findOne({_id: company_id}).then(companyInfo => {
        return Promise.all([
          this.planModel.getSetting(planInfo.plan),
          mapObjectIdToData(companyInfo.projects, 'project', 'is_archived')
        ]).then(([setting, projectList]) => {
          if (companyInfo.projects.length >= setting.project_all){
            let limit = C.PROJECT_QUANTITY_LIMIT.OVER_TOTAL;
            return limit;
          }
          let count = _.countBy(projectList, item => {
            if (item.is_archived) {
              return 'archived';
            } else {
              return 'actived';
            }
          });
          if (count.actived >= setting.project_actived) {
            let limit = C.PROJECT_QUANTITY_LIMIT.OVER_ACTIVED;
            return limit;
          }
          return null;
        });
      });
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
        if (findObjectIdIndex(existItems, target_id) > -1) {
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

  getPlanInfo() {
    return this.planModel.getCurrent(true);
  }

  getModulesByPlan(plan) {
    return authConfig[plan];
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
