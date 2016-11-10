import config from 'config';
import {
  APPROVAL_ITEM_RESULT,
  COMPANY_MEMBER_INVITE,
  TASK_ASSIGNED,
  TASK_DAYLYREPORT,
  REQUEST_ACCEPT,
  SCHEDULE_REMIND,
  ATTENDENCE,
} from 'models/notification-setting';


/**
 * 微信模板消息
 */
export let templates = {
  [APPROVAL_ITEM_RESULT]: {
    _id: config.get('wechat.templates.APPROVAL_ITEM_RESULT'),
    title: '审批结果提醒',
    data: '{{first.DATA}}' +
          '审批事项：{{keyword1.DATA}}' +
          '审批结果：{{keyword2.DATA}}' +
          '{{remark.DATA}}'
  },
  [COMPANY_MEMBER_INVITE]: {
    _id: '',
    title: '团队成员邀请',
    data: ''
  },
  [TASK_ASSIGNED]: {
    _id: config.get('wechat.templates.TASK_ASSIGNED'),
    title: '新任务通知',
    data: '{{first.DATA}}' +
          '标题：{{keyword1.DATA}}' +
          '描叙：{{keyword2.DATA}}' +
          '优先级：{{keyword3.DATA}}' +
          '创建者：{{keyword4.DATA}}' +
          '{{remark.DATA}}'
  },
  [TASK_DAYLYREPORT]: {
    _id: config.get('wechat.templates.TASK_DAYLYREPORT'),
    title: '待办任务提醒',
    data: '{{first.DATA}}' +
          '待处理任务：{{keyword1.DATA}}' +
          '已延期任务：{{keyword2.DATA}}' +
          '{{remark.DATA}}',
  },
  [REQUEST_ACCEPT]: {
    _id: config.get('wechat.templates.REQUEST_ACCEPT'),
    title: '成员加入提醒',
    data: '{{first.DATA}}' +
          '姓名：{{keyword1.DATA}}' +
          '时间：{{keyword2.DATA}}' +
          '{{remark.DATA}}',
  },
  [SCHEDULE_REMIND]: {
    _id: config.get('wechat.templates.SCHEDULE_REMIND'),
    title: '待办事项提醒',
    data: '{{first.DATA}}' +
          '待办事项：{{keyword1.DATA}}' +
          '提醒时间：{{keyword2.DATA}}' +
          '{{remark.DATA}}',
  },
  [ATTENDENCE]: {
    _id: config.get('wechat.templates.ATTENDENCE'),
    title: '考勤提醒',
    data: '{{first.DATA}}' +
          '姓名：{{keyword1.DATA}}' +
          '考勤类型：{{keyword2.DATA}}' +
          '{{remark.DATA}}',
  },
};

export default function getTemplate(type) {
  return templates[type] && templates[type]['_id'];
}
