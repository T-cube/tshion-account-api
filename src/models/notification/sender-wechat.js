import moment from 'moment';

import C from 'lib/constants';
import getTemplate from 'lib/wechat-message-template';
import UrlHelper from 'models/url-helper';
import wUtil from 'lib/wechat-util';

import {
  APPROVAL_ITEM_RESULT,    //  审批结果提醒
  COMPANY_MEMBER_INVITE,   //  ? ...
  TASK_ASSIGNED,           //  任务提醒
  TASK_DAYLYREPORT,        //  待办任务提醒
  REQUEST_ACCEPT,          //  成员加入提醒
  SCHEDULE_REMIND,         //  待办事项提醒
  ATTENDENCE,              //  考勤提醒
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
    let { todayTasks, expiredTasks } = extended;
    return {
      'first': {
        'value': '您今天有以下任务待处理！',
        'color': colors.primary
      },
      'keyword1': {
        'value': todayTasks.map(task => task.name).join('，'),
        'color': colors.primary
      },
      'keyword2': {
        'value': expiredTasks.map(task => task.name).join('，'),
        'color': colors.primary
      },
      'remark': {
        'value': '请及时处理',
      }
    };
  },
  [REQUEST_ACCEPT]: (extended) => {
    let { company, from, date_create } = extended;
    return {
      'first': {
        'value': `新成员加入了团队 ${company.name}`,
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
    let { schedules } = extended;
    return {
      'first': {
        'value': '今天的日程提醒',
        'color': colors.primary
      },
      'keyword1': {
        'value': schedules.map(schedule => schedule.title).join('，'),
        'color': colors.primary
      },
      'keyword2': {
        'value': moment().format('YYYY/MM/DD HH:mm'),
        'color': colors.primary
      },
      'remark': {
        'value': '',
      }
    };
  },
  [ATTENDENCE]: (extended) => {
    let { company, user, sign_type } = extended;
    return {
      'first': {
        'value': `考勤提醒，${company.name}`,
        'color': colors.primary
      },
      'keyword1': {
        'value': user.name,
        'color': colors.primary
      },
      'keyword2': {
        'value': sign_type == 'sign_in' ? '签到' : '签退',
        'color': colors.primary
      },
      'remark': {
        'value': '快上班了，别忘了打卡',
      }
    };
  },
};

export default class WechatSender {

  constructor() {
    this.urlHelper = new UrlHelper();
  }

  send(type, data, extended) {
    let template = this.getTemplate(type);
    if (!template) {
      return null;
    }
    let url = this.urlHelper.getMobileUrl(type, extended);
    let tplData = this.getData(type, extended);
    return wUtil.sendTemplateMessage(data.to, template, url, tplData);
  }

  getTemplate(type) {
    return getTemplate(type);
  }

  getData(type, extended) {
    return render[type](extended);
  }

}
