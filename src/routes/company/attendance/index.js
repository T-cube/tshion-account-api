import _ from 'underscore';
import express from 'express';
import { ObjectId } from 'mongodb';
import Promise from 'bluebird';
import moment from 'moment';
import config from 'config';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { sanitizeValidateObject } from 'lib/inspector';
import {
  signSanitization,
  signValidation,
  settingSanitization,
  settingValidation,
  auditSanitization,
  auditValidation,
  recordSanitization,
  recordValidation,
  validate,
} from './schema';
import C from 'lib/constants';
import { checkUserTypeFunc, checkUserType } from '../utils';
import { fetchUserInfo } from 'lib/utils';
import {
  fetchCompanyMemberInfo,
  mapObjectIdToData,
  getClientIp,
  getGpsDistance,
  generateToken,
} from 'lib/utils';
import Attendance from 'models/attendance';
import Approval from 'models/approval';
import Structure from 'models/structure';
import { upload, saveCdn } from 'lib/upload';
import { attachFileUrls } from 'routes/company/document/index';

const api = express.Router();
export default api;


api.get('/jsapi', (req, res, next) => {
  req.model('wechat-util').getWechatApi().getJsConfig({
    debug: false,
    jsApiList: ['getNetworkType'],
    url: config.get('mobileUrl') + `oa/company/${req.company._id}/feature/attend/mine`
  }, (err, jsapiInfo) => {
    err && next(err);
    res.json(jsapiInfo);
  });
});

api.post('/sign', ensureFetchSettingOpened, (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(signSanitization, signValidation, data);
  checkUserLocation(req.company._id, data.location).then(isValid => {
    let from_pc = !!req.query.from_pc && getClientIp(req);
    if (!isValid && !from_pc) {
      throw new ApiError(400, 'invalid_user_location');
    }
    let now = new Date();
    _.extend(data, {
      date: now
    });
    return new Attendance(req.attendanceSetting).updateSign({
      data: [data],
      date: now,
      from_pc
    }, req.user._id, false)
    .then(record => {
      let info = {
        action: data.type == C.ATTENDANCE_SIGN_TYPE.SIGN_IN ?
          C.ACTIVITY_ACTION.SIGN_IN :
          C.ACTIVITY_ACTION.SIGN_OUT,
        target_type: C.OBJECT_TYPE.ATTENDANCE_SIGN_DATA,
        creator: req.user._id,
        company: req.company._id,
        sign_record: record[data.type]
      };

      req.model('activity').insert(info);

      res.json({});

      // 打卡积分
      if(info.action==C.ACTIVITY_ACTION.SIGN_IN) {
        const clientRpc = req.model('clientRpc');
        const user = req.user;
        clientRpc.route('/activity/sign', {user_id: user._id, activity_id: '59cb69fbf3eb0a3e16acf5b7',mobile: user.mobile, email: user.email}, data=>{
          if(data.code!==200) console.log(data);
        });
      }
    });
  })
  .catch(next);
});

api.post('/outdoor/sign', (req, res, next) => {
  validate('outdoorSign', req.body);
  let sign_data = req.body;
  _.extend(sign_data, {
    company: req.company._id,
    user: req.user._id,
    date_create: new Date(),
  });
  db.attendance.outdoor.insert(sign_data)
  .then(doc => {
    res.json(doc);
  })
  .catch(next);
});

api.get('/outdoor/today', (req, res, next) => {
  db.attendance.outdoor.count({
    user: req.user._id,
    date_create: {
      $gte: moment().startOf('day').toDate()
    }
  })
  .then(counts => {
    res.json({counts: counts});
  })
  .catch(next);
});

// api.get('/outdoor/range', (req, res, next) => {
//   validate('outdoorQuery', req.query);
//   let query = {
//     company: req.company._id,
//     date_create: {
//       $gte: req.query.date_start,
//       $lte: req.queyr.date_end,
//     }
//   };
//   if (req.query.user_id) {
//     _.extend(query, {
//       user: req.query.user_id
//     });
//   }
//   db.attendance.outdoor.find(query)
//   .then(list => {
//     return fetchUserInfo(list, 'user').then(() => {
//       return Promise.map(list, item => {
//         return mapObjectIdToData(item.pic_record, 'cdn_key').then(() => {
//           return Promise.map(item.pic_record, pic => {
//             return attachFileUrls(req, pic);
//           });
//         });
//       });
//     }).then(() => {
//       res.json(list);
//     });
//   })
//   .catch(next);
// });

api.post('/outdoor/upload',
  (req,res, next) => {
    let file_size = parseInt(req.headers['content-length']);
    if (file_size > 20 * 1024 * 1024) {
      throw new ApiError(400, 'pic_too_large');
    }
    next();
  },
  upload({type: 'attachment'}).single('document'),
  saveCdn('cdn-file'),
  (req, res, next) => {
    let file = req.file;
    let fileData = _.pick(file, 'mimetype', 'url', 'relpath', 'size', 'cdn_bucket', 'cdn_key');
    _.extend(fileData, {
      name: file.originalname,
      company: req.company._id,
      author: req.user._id,
      date_update: new Date(),
      date_create: new Date(),
      updated_by: req.user._id,
      path: null
    });
    return db.user.file.insert(fileData).then(doc => {
      let slim_size = '1920,1920';
      return attachFileUrls(req, doc, '32', slim_size).then(() => {
        res.json(doc);
      });
    });
  }
);

api.get('/outdoor', (req, res, next) => {
  const limit = config.get('view.userLoginListNum');
  validate('outdoorList', req.query);
  let query = {};
  if (req.query.type == 'mine') {
    _.extend(query, {user: req.user._id});
  }
  if (req.query.last_id) {
    _.extend(query, { _id: { $lt: req.query.last_id } });
  }
  return db.attendance.outdoor
  .find(query)
  .sort({_id: -1})
  .limit(limit)
  .then(list => {
    return fetchUserInfo(list, 'user').then(() => {
      return Promise.map(list, item => {
        return mapObjectIdToData(item.pic_record, 'user.file', 'name,cdn_key').then(() => {
          return Promise.map(item.pic_record, pic => {
            let slim_size = '1920,1920';
            return attachFileUrls(req, pic, '32', slim_size);
          });
        });
      });
    }).then(() => {
      res.json(list);
    });
  })
  .catch(next);
});

api.get('/sign/user/:user_id', (req, res, next) => {
  let user_id = ObjectId(req.params.user_id);
  let year = parseInt(req.query.year);
  let month = parseInt(req.query.month);
  if (!year || !month) {
    let date = new Date();
    year = date.getFullYear();
    month = date.getMonth() + 1;
  }
  if (!user_id.equals(req.user._id) && !checkUserTypeFunc(req, C.COMPANY_MEMBER_TYPE.ADMIN)) {
    throw new ApiError(400, 'forbidden');
  }
  db.attendance.sign.findOne({
    user: user_id,
    year: year,
    month: month,
    company: req.company._id,
  })
  .then(doc => {
    if (!doc) {
      doc = {
        data: [],
        year,
        month
      };
    }
    res.json(doc);
  })
  .catch(next);
});

api.get('/sign/date', (req, res, next) => {
  let date = new Date(req.query.date);
  if (!date.getTime()) {
    date = new Date();
  }
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  let day = date.getDate();
  let user_id = req.user._id;
  db.attendance.sign.findOne({
    user: user_id,
    year: year,
    month: month,
    company: req.company._id,
  })
  .then(doc => {
    let sign = doc && doc.data && _.find(doc.data, item => item.date == day);
    res.json(sign || {});
  })
  .catch(next);
});

api.get('/sign/department/:department_id', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), fetchSetting, (req, res, next) => {
  if (!req.attendanceSetting) {
    return res.json([]);
  }
  let department_id = ObjectId(req.params.department_id);
  let page = parseInt(req.query.page) || 1;
  let pageSize = config.get('view.attendRecordNum');
  let { year, month } = getQueryMonth(req.query);
  let attendance = new Attendance(req.attendanceSetting);
  attendance.getDepartmentRecord(req.company, department_id, {
    year,
    month,
    page,
    pageSize
  })
  .then(record => res.json(record))
  .catch(next);
});

api.get('/sign/today', (req, res, next) => {
  validate('pageInfo', req.query);
  let year = moment().year();
  let month = moment().month() + 1;
  let date = moment().date();
  let page = req.query.page;
  let pagesize = req.query.pagesize;
  let criteria = {
    company: req.company._id,
    year,
    month: month,
    'data.date': date
  };
  if (req.query.department_id) {
    let tree = new Structure(req.company.structure);
    let members = tree.getMemberAll(req.query.department_id).map(member => member._id);
    criteria.user = { $in: members };
  }
  return Promise.all([
    db.attendance.sign.count(criteria),
    db.attendance.sign.find(criteria, {
      user: 1,
      year: 1,
      month: 1,
      'data.$': 1
    })
    .limit(pagesize)
    .skip((page - 1) * pagesize)
  ])
  .then(([count, list]) => {
    res.json({
      list,
      count
    });
  })
  .catch(next);
});

api.get('/sign/department/:department_id/export', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  return generateToken(48)
  .then(token => {
    let { year, month } = getQueryMonth(req.query);
    return db.attendance.export.insert({
      token,
      user: req.user._id,
      company: req.company._id,
      department_id: req.params.department_id,
      year,
      month,
    })
    .then(() => res.json({token}));
  })
  .catch(next);
});

api.put('/record', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  let data = req.body;
  sanitizeValidateObject(recordSanitization, recordValidation, data);
  let condition = {
    year: data.year,
    month: data.month,
    company: req.company._id,
  };
  if (data.members.length > 100) {
    throw new ApiError(400);
  }
  Promise.map(data.members, member => (
    db.attendance.record.update(_.extend({}, condition, {member: member.member}), {
      $set: {
        data: _.emit(member, 'member')
      }
    }, {upsert: true})
  ))
  .then(() => res.json({}))
  .catch(next);
});

api.post('/audit', (req, res, next) => {
  let data = req.body;
  let company_id = req.company._id;
  let user_id = req.user._id;
  sanitizeValidateObject(auditSanitization, auditValidation, data);

  getApprovalTpl(company_id, '_id')
  .then(template => {
    let signInData = _.find(data.data, item => item.type == C.ATTENDANCE_SIGN_TYPE.SIGN_IN);
    let signOutData = _.find(data.data, item => item.type == C.ATTENDANCE_SIGN_TYPE.SIGN_OUT);
    let item = {
      for: C.APPROVAL_TARGET.ATTENDANCE_AUDIT,
      template: template._id,
      department: '',
      content: data.reason,
      forms: [{
        _id: template.forms[0]._id,
        value: data.date,
      }, {
        _id: template.forms[1]._id,
        value: signInData ? moment(signInData.date).toDate() : '',
      }, {
        _id: template.forms[2]._id,
        value: signOutData ? moment(signOutData.date).toDate() : '',
      }],
      from: user_id,
      company_id: company_id,
      apply_date: new Date(),
      status: C.APPROVAL_ITEM_STATUS.PROCESSING,
      is_archived: false,
    };
    return Approval.createItem(item, req);
  })
  .then(() => {
    res.json({});
    return addActivity(req, C.ACTIVITY_ACTION.SIGN_AUDIT, {
      field: {
        date: data.date,
        data: data.data
      }
    });
  })
  .catch(next);
});

// api.get('/audit', (req, res, next) => {
//   db.attendance.audit.find({
//     company: req.company._id,
//   })
//
//   .then(doc => res.json(doc))
// })
//
// api.get('/audit/:audit_id', (req, res, next) => {
//   db.attendance.audit.findOne({
//     company: req.company._id,
//     _id: ObjectId(req.params.audit_id),
//   })
//   .then(doc => {
//     if (!doc) {
//       throw new ApiError(404)
//     }
//     res.json(doc)
//   })
//   .catch(next)
// })

// api.post('/audit/:audit_id/accept', (req, res, next) => {
//   let setting = new Attendance(req.attendanceSetting);
//   if (!setting.isAuditor(req.user._id)) {
//     throw new ApiError(403, null, 'user is not auditor')
//   }
//   db.attendance.audit.findOne({
//     _id: ObjectId(req.params.audit_id),
//     company: req.company._id,
//     status: C.ATTENDANCE_AUDIT_STATUS.PENDING,
//   })
//   .then(doc => {
//     if (!doc) {
//       throw new ApiError(404)
//     }
//
//   })
//   .catch(next)
// })
//
// api.post('/audit/:audit_id/reject', (req, res, next) => {
//   let setting = new Attendance(req.attendanceSetting);
//   if (!setting.isAuditor(req.user._id)) {
//     throw new ApiError(403, null, 'user is not auditor')
//   }
//   db.attendance.audit.update({
//     _id: ObjectId(req.params.audit_id),
//     company: req.company._id,
//     status: C.ATTENDANCE_AUDIT_STATUS.PENDING,
//   }, {
//     status: C.ATTENDANCE_AUDIT_STATUS.REJECTED,
//   })
//   .then(doc => res.json(doc))
//   .catch(next)
// })

api.get('/setting', (req, res, next) => {
  db.attendance.setting.findOne({
    _id: req.company._id
  })
  .then(doc => {
    if (!doc) {
      res.json({
        is_open: false,
        time_start: '09:00',
        time_end: '18:00',
        ahead_time: 0,
        workday: [1, 2, 3, 4, 5],
        location: {
          // latitude: 39.998766,
          // longitude: 116.273938,
        },
        max_distance: 200,
        workday_special: [],
        holiday: [],
        audit: true,
      });
    } else {
      return Promise.all([
        fetchCompanyMemberInfo(req.company, doc, 'auditor'),
        mapObjectIdToData(doc, 'approval.template', 'name,status,steps', 'approval_template'),
      ])
      .then(() => res.json(doc));
    }
  })
  .catch(next);
});

api.put('/setting', checkUserType(C.COMPANY_MEMBER_TYPE.ADMIN), (req, res, next) => {
  let data = req.body;
  let company_id = req.company._id;
  sanitizeValidateObject(settingSanitization, settingValidation, data);
  if (checkDupliDate(data.workday_special) || checkDupliDate(data.holiday)) {
    throw new ApiError(400, 'validation_error');
  }
  let $set = _.clone(data);
  let update = {$set};
  if (data.auditor) {
    if (!_.find(req.company.members, i => i._id.equals(data.auditor))) {
      throw new ApiError(400,'member_not_exists');
    }
  } else {
    delete $set.auditor;
    delete $set.approval_template;
    update.$unset = {
      auditor: 1,
      approval_template: 1
    };
  }
  let prepare;
  if (data.approval_template) {
    prepare = db.approval.template.findOne({
      _id: data.approval_template
    })
    .then(doc => {
      if (doc && doc.status == C.APPROVAL_STATUS.DELETED) {
        delete data.approval_template;
      }
      return;
    });
  } else {
    prepare = Promise.resolve();
  }
  prepare.then(() => {
    db.attendance.setting.findAndModify({
      query: {
        _id: company_id
      },
      update,
      fields: {
        approval_template: 1
      },
      upsert:true
    })
    .then(doc => {
      let setting = doc.value;
      res.json(_.extend({}, setting, data));
      if (!data.approval_template && data.auditor && data.steps) {
        data.steps.forEach(step => {
          step._id = ObjectId();
        });
        return createApprovalTemplate(req, data.steps)
        .then(() => {
          return db.attendance.setting.update({
            _id: req.company._id,
          }, {
            $set: {
              steps: data.steps
            }
          });
        });
      }
      if (setting.approval_template && !data.auditor) {
        return disableApprovalTemplate(req, setting.approval_template);
      }
      if (data.approval_template && data.auditor && data.steps) {
        data.steps.forEach(step => {
          step._id = ObjectId();
        });
        let criteria = {
          _id: data.approval_template,
          company_id: req.company._id,
          status: C.APPROVAL_STATUS.UNUSED
        };
        return db.approval.template.update({
          _id: data.approval_template
        }, {
          $set: {
            status: C.APPROVAL_STATUS.UNUSED
          }
        })
        .then(() => {
          return Approval.cancelItemsUseTemplate(req, data.approval_template, C.ACTIVITY_ACTION.UPDATE);
        })
        .then(() => {
          return db.approval.template.findOne({
            _id: data.approval_template
          }, {
            description: 1,
            forms: 1,
            name: 1,
            scope: 1,
          })
          .then(template => {
            delete template._id;
            _.extend({steps: data.steps}, data);
            return Approval.createNewVersionTemplate(data, {
              criteria
            })
            .then(() => {
              return createApprovalTemplate(req, data.steps)
              .then(() => {
                return db.attendance.setting.update({
                  _id: req.company._id,
                }, {
                  $set: {
                    steps: data.steps
                  }
                });
              });
            });
          });
        });
      }
    });
  })
  .catch(next);
});

function getQueryMonth(query) {
  let year = parseInt(query.year);
  let month = parseInt(query.month);
  if (!year || !month) {
    let date = new Date();
    year = date.getFullYear();
    month = date.getMonth() + 1;
  }
  return { year, month };
}

function checkDupliDate(list) {
  let newList = _.clone(list);
  let dupli = false;
  list.reverse().forEach(item => {
    newList.pop();
    if (_.find(newList, i => i.date == item.date)) {
      dupli = true;
    }
  });
  return dupli;
}

function getApprovalTpl(company_id) {
  return db.attendance.setting.findOne({
    _id: company_id
  }, {
    approval_template: 1
  })
  .then(setting => {
    if (!setting || !setting.approval_template) {
      return {};
    }
    return db.approval.template.findOne({
      _id: setting.approval_template
    });
  });
}

function fetchSetting(req, res, next) {
  db.attendance.setting.findOne({
    _id: req.company._id,
  })
  .then(doc => {
    req.attendanceSetting = doc;
    next();
  })
  .catch(e => next(e));
}

function ensureFetchSettingOpened(req, res, next) {
  db.attendance.setting.findOne({
    _id: req.company._id,
  })
  .then(doc => {
    if (!doc || !doc.is_open) {
      throw new ApiError(400, 'attendance_is_closed');
    }
    req.attendanceSetting = doc;
    next();
  })
  .catch(e => next(e));
}

function addActivity(req, action, data) {
  let info = {
    action: action,
    target_type: C.OBJECT_TYPE.ATTENDANCE,
    creator: req.user._id,
  };
  _.extend(info, data);
  return req.model('activity').insert(info);
}

function checkUserLocation(companyId, pos) {
  if (!pos) {
    return Promise.resolve(false);
  }
  return db.attendance.setting.findOne({
    _id: companyId
  }, {
    is_open: 1,
    location: 1,
    max_distance: 1,
  })
  .then(s => {
    let accuracy = pos.accuracy;
    // pos = new MarsGPS().transform(pos);
    let distance = getGpsDistance(pos, s.location);
    if ((distance + accuracy * 0.1) <= s.max_distance) {
      return true;
    }
    return false;
  });
}

function createApprovalTemplate(req, steps) {
  let template = {
    for: C.APPROVAL_TARGET.ATTENDANCE_AUDIT,
    forms_not_editable: true,
    name: '补签',
    description: '考勤补签开启后自动生成的流程，审批通过之后会自动修改考勤记录',
    scope: [req.company.structure._id],
    company_id: req.company._id,
    status: C.APPROVAL_STATUS.NORMAL,
    steps: steps,
    forms: [
      {
        _id: ObjectId(),
        label: '类型',
        optionsKeyValueSame: false,
        required: true,
        type: 'radiogroup',
        options: [
          {
            label: '签到',
            value: 'sign_in'
          },
          {
            label: '签退',
            value: 'sign_out'
          }
        ]
      }, {
        _id: ObjectId(),
        label: '考勤时间',
        type: 'datetime',
        required: true,
      }
    ],
  };
  return Approval.createNewVersionTemplate(template, {
    criteria: {
      company_id: req.company._id,
      for: C.APPROVAL_TARGET.ATTENDANCE_AUDIT,
    },
    createNew: true,
    templateStatus: C.APPROVAL_STATUS.NORMAL
  })
  .then(template => {
    return db.attendance.setting.update({
      _id: req.company._id,
    }, {
      $set: {
        approval_template: template._id
      }
    });
  });
}

function disableApprovalTemplate(req, templateId) {
  return Promise.all([
    db.approval.template.update({
      _id: templateId
    }, {
      $set: {
        status: C.APPROVAL_STATUS.DELETED
      },
      $unset: {
        forms_not_editable: 1
      }
    }),
    Approval.cancelItemsUseTemplate(req, templateId)
  ]);
}
