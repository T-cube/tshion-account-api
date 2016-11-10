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
    _id: 'gsYoVNFkxSi7Q9dFeSikaSqHsg5pHURwc-da8RxGghg',
    title: '审批结果提醒',
    data: '{{first.DATA}}' +
          '审批事项：{{keyword1.DATA}}' +
          '审批结果：{{keyword2.DATA}}' +
          '{{remark.DATA}}'
  },
  COMPANY_MEMBER_INVITE: {
    _id: '',
    title: '团队成员邀请',
    data: ''
  },
  TASK_ASSIGNED: {
    _id: 'zFCBJwQwHIHW95JsKSXuGJqSgVwvpnokQRbTXPDeKbw',
    title: '新任务通知',
    data: '{{first.DATA}}' +
          '标题：{{keyword1.DATA}}' +
          '描叙：{{keyword2.DATA}}' +
          '优先级：{{keyword3.DATA}}' +
          '创建者：{{keyword4.DATA}}' +
          '{{remark.DATA}}'
  },
  TASK_DAYLYREPORT: {
    _id: '0BdmQfgjL3SMv5F7Q6BaciSFw7eaoG7A5vYtHckMlQI',
    title: '待办任务提醒',
    data: '{{first.DATA}}' +
          '待处理任务：{{keyword1.DATA}}' +
          '已延期任务：{{keyword2.DATA}}' +
          '{{remark.DATA}}',
  },
  REQUEST_ACCEPT: {
    _id: 'Rw2ZZ6ryHMTvYNn-ajO41PP9RiT_qwS2hW3o-giowsw',
    title: '成员加入提醒',
    data: '{{first.DATA}}' +
          '姓名：{{keyword1.DATA}}' +
          '时间：{{keyword2.DATA}}' +
          '{{remark.DATA}}',
  },
  SCHEDULE_REMIND: {
    _id: '6uvplr2mosnDG8VwdKsPw_ANWfuBMzOWUD7xDVVHlc4',
    title: '待办事项提醒',
    data: '{{first.DATA}}' +
          '待办事项：{{keyword1.DATA}}' +
          '提醒时间：{{keyword2.DATA}}' +
          '{{remark.DATA}}',
  },
  ATTENDENCE: {
    _id: 'hRzNn-bytk6hjAU0-sh7-0lTN-uloL93c0pfFDTIJKc',
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
