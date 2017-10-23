import moment from 'moment';
import Sender from './sender';

import C from 'lib/constants';
import getTemplate from 'lib/wechat-message-template';

import {
  APPROVAL_ITEM_RESULT,    //  审批结果提醒
  COMPANY_MEMBER_INVITE,   //  ? ...
  TASK_ASSIGNED,           //  任务提醒
  TASK_DAYLYREPORT,        //  待办任务提醒
  REQUEST_ACCEPT,          //  成员加入提醒
  SCHEDULE_REMIND,         //  待办事项提醒
  ATTENDANCE,              //  考勤提醒
  APP,                     //  应用提醒
} from 'models/notification-setting';

const colors = {
  primary: '#173177',
  success: '#419641',
  error: '#ef4f4f'
};

let render = {
  [APPROVAL_ITEM_RESULT]: (extended) => {
    let { approval_item } = extended;
    let isApproved = approval_item.status != C.APPROVAL_ITEM_STATUS.REJECTED;
    return {
      'first': {
        'value': '您好！',
        'color': colors.primary
      },
      'keyword1': {
        'value': `『${approval_item.title}』 ${approval_item.content}`,
        'color': colors.primary
      },
      'keyword2': {
        'value': isApproved ? '通过' : '驳回',
        'color': isApproved ? colors.success : colors.error
      },
      'remark': {
        'value': moment().format('YYYY/MM/DD HH:mm'),
      }
    };
  },
  [COMPANY_MEMBER_INVITE]: (extended) => {
    let { company, from } = extended;
    return {
      'first': {
        'value': '您有新的团队邀请！',
        'color': colors.primary
      },
      'keyword1': {
        'value': company.name,
        'color': colors.primary
      },
      'keyword2': {
        'value': from.name,
        'color': colors.primary
      },
      'remark': {
        'value': moment().format('YYYY/MM/DD HH:mm'),
      }
    };
  },
  [TASK_ASSIGNED]: (extended) => {
    let { task, from } = extended;
    return {
      'first': {
        'value': '您有新的任务！',
        'color': colors.primary
      },
      'keyword1': {
        'value': task.title,
        'color': colors.primary
      },
      'keyword2': {
        'value': task.description,
      },
      'keyword3': {
        'value': ['普通', '正常', '紧急', '十万火急'][task.priority],
      },
      'keyword4': {
        'value': from.name, // task creator
      },
      'remark': {
        'value': '请查看',
      }
    };
  },
  [TASK_DAYLYREPORT]: (extended) => {
    let { todayTasks, expiredTasks } = extended.field;
    return {
      'first': {
        'value': '您今天有以下任务待处理！',
        'color': colors.primary
      },
      'keyword1': {
        'value': todayTasks.map(task => task.title).join('，') || '无',
        'color': colors.primary
      },
      'keyword2': {
        'value': expiredTasks.map(task => task.title).join('，') || '无',
        'color': colors.primary
      },
      'remark': {
        'value': '请及时处理',
      }
    };
  },
  [REQUEST_ACCEPT]: (extended) => {
    let { from, date_create } = extended;
    return {
      'first': {
        'value': '新成员加入了团队',
        'color': colors.primary
      },
      'keyword1': {
        'value': from.name,
        'color': colors.primary
      },
      'keyword2': {
        'value': moment(date_create).format('YYYY/MM/DD HH:mm'),
        'color': colors.primary
      },
      'remark': {
        'value': '',
      }
    };
  },
  [SCHEDULE_REMIND]: (extended) => {
    let { schedule } = extended;
    return {
      'first': {
        'value': '您有新的日程提醒',
        'color': colors.primary
      },
      'keyword1': {
        'value': schedule.title,
        'color': colors.primary
      },
      'keyword2': {
        'value': schedule.description,
        'color': colors.primary
      },
      'remark': {
        'value': '开始时间：' + moment(schedule.date_start).format('YYYY/MM/DD HH:mm'),
      }
    };
  },
  [ATTENDANCE]: (extended) => {
    let { company, company_member, sign_type } = extended;
    return {
      'first': {
        'value': `${company.name}，考勤提醒`,
        'color': colors.primary
      },
      'keyword1': {
        'value': company_member.name,
        'color': colors.primary
      },
      'keyword2': {
        'value': sign_type == 'sign_in' ? '签到' : '签退',
        'color': colors.primary
      },
      'remark': {
        'value': '别忘了打卡哦！',
      }
    };
  },
  [APP]: (extended) => {
    let { target_type, from, action, date_create, activity, activity_approval, report } = extended;
    let remark;
    target_type = __(target_type);
    if (activity) {
      action = __(action) + '活动';
      let activity_time = moment(activity.time_start).format('YYYY-MM-DD HH:mm');
      remark = `请于${activity_time}准时参加活动`;
    }
    if (activity_approval) {
      action = __(action) + '活动审批';
      remark = '请及时完成审批工作。';
    }
    if (report) {
      action = __(action) + '工作汇报';
      remark = '请到T立方工作平台查看。';
    }
    return {
      'first': {
        'value': `${target_type}，提醒`,
        'color': colors.primary
      },
      'keyword1': {
        'value': `${from.name}${action}`,
        'color': colors.primary
      },
      'keyword2': {
        'value': moment(date_create).format('YYYY-MM-DD HH:mm'),
        'color': colors.primary
      },
      'remark': {
        'value': remark
      }
    };
  },
};

export default class WechatSender extends Sender {

  constructor() {
    super();
  }

  send(type, data, extended) {
    let template = this.getTemplate(type);
    if (!template) {
      return Promise.resolve();
    }
    let url = this.urlHelper.getMobileUrl(type, extended);
    let tplData = this.getData(type, extended);
    return this.model('wechat-util').sendTemplateMessage(data.to, template, url, tplData);
  }

  getTemplate(type) {
    return getTemplate(type);
  }

  getData(type, extended) {
    return render[type](extended);
  }

}
