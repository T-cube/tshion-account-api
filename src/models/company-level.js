import _ from 'underscore';
import config from 'config';
import { ObjectId } from 'mongodb';

import db from 'lib/database';
import C from 'lib/constants';
import { ApiError } from 'lib/error';
import { indexObjectId } from 'lib/utils';

export default class CompanyLevel {

  constructor(company) {
    if (ObjectId.isValid(company)) {
      this.setCompanyId(company);
    } else {
      this.setCompanyInfo(company);
    }
  }

  setCompanyInfo(company) {
    this.company = company;
    this.companyId = company._id;
  }

  setCompanyId(companyId) {
    this.companyId = ObjectId(companyId);
    this.company = null;
  }

  canUpload(size) {
    let total_size;
    if (_.isArray(size)) {
      total_size = _.reduce(size, (memo, num) => (memo + num), 0);
    } else {
      total_size = size;
      size = [size];
    }
    return this.getCompanyInfo().then(() => {
      let level = this.getLevel();

      let store_max_file_size = config.get(`accountLevel.${level}.store_max_file_size`);
      let store_max_total_size = config.get(`accountLevel.${level}.store_max_total_size`);

      for (let i in size) {
        if (size[i] > store_max_file_size) {
          return Promise.resolve({
            ok: 0,
            code: C.LEVEL_ERROR.OVER_STORE_MAX_FILE_SIZE,
          });
        }
      }

      return this.getLevelInfo().then(info => {
        let size = info.file.size;
        if ((size + total_size) > store_max_total_size) {
          return {
            ok: 0,
            code: C.LEVEL_ERROR.OVER_STORE_MAX_TOTAL_SIZE,
          };
        }
        return {
          ok: 1
        };
      });
    });

  }

  getLevelInfo() {
    if (!this.companyId) {
      return this._rejectWhenMissingCompany();
    }
    if (this.company && this.company.cached_level_info) {
      return Promise.resolve(this.company.cached_level_info);
    }
    return db.company.level.findOne({
      _id: this.companyId
    })
    .then(info => {
      if (info) {
        return info;
      }
      info = {
        _id: this.company._id,
        file: {
          size: 0,
          knowledge: {
            size: 0
          },
          project: []
        }
      };
      return db.company.level.insert(info).then(() => info);
    });
  }

  clearCachedLevelInfo() {
    this.company && delete this.company.cached_level_info;
  }

  updateUpload(args) {
    if (!this.companyId) {
      return this._rejectWhenMissingCompany();
    }
    let { size, target_type, target_id } = args;
    target_id = ObjectId(target_id);
    if (!size) {
      return Promise.resolve(true);
    }
    return this.getLevelInfo().then(info => {
      if (target_type == 'knowledge') {
        return db.company.level.update({
          _id: this.companyId,
        }, {
          $inc: {
            'file.size': size,
            [`file.${target_type}.size`]: size
          }
        });
      }
      if (!target_type || !target_id) {
        throw new ApiError('missing target_type or target_id');
      }

      if (info.file[target_type]) {
        let existItems = info.file[target_type].map(item => item._id);
        if (indexObjectId(existItems, target_id) > -1) {
          return db.company.level.update({
            _id: this.companyId,
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
        _id: this.companyId,
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
    })
    .then(() => this.clearCachedLevelInfo());
  }

  canAddMember() {
    return this.getMemberLevelInfo().then(info => {
      let {
        max_members,
        member_num
      } = info;
      return max_members > member_num;
    });
  }

  getMemberLevelInfo() {
    return this.getCompanyInfo().then(() => {
      let level = this.getLevel();
      let max_members = config.get(`accountLevel.${level}.max_members`);
      return {
        max_members,
        member_num: this.company.members.length,
      };
    });
  }

  getStorageInfo() {
    return this.getCompanyInfo().then(() => {
      let level = this.getLevel();

      let store_max_file_size = config.get(`accountLevel.${level}.store_max_file_size`);
      let store_max_total_size = config.get(`accountLevel.${level}.store_max_total_size`);

      return this.getLevelInfo().then(levelInfo => {
        return _.extend(levelInfo.file, {
          store_max_file_size,
          store_max_total_size,
        });
      });
    });

  }

  getUsedStorageSize(target_type, target_id) {
    return this.getLevelInfo().then(info => {
      if (!target_type) {
        return info.file.size || 0;
      }
      if (target_type == 'knowledge') {
        return info.file.knowledge.size || 0;
      }
      if (target_type == 'project') {
        let existItems = info.file[target_type].map(item => item._id);
        let index = indexObjectId(existItems, target_id);
        if (index > -1) {
          return info.file[target_type][index].size;
        } else {
          return 0;
        }
      }
    });
  }

  getLevel() {
    if (!this.company) {
      throw new ApiError(500, null, 'missing company');
    }
    return this.company.level || 'free';
  }

  getCompanyInfo() {
    let company = this.company;
    if (company && company.members && company.level) {
      return Promise.resolve(company);
    }
    if (!this.companyId) {
      return this._rejectWhenMissingCompany();
    }
    return db.company.findOne({
      _id: this.companyId
    }, {
      structure: 0,
    })
    .then(company => {
      this.company = company;
      return company;
    });
  }

  _rejectWhenMissingCompany() {
    return Promise.reject(new ApiError(400, null, 'missing company'));
  }

}
