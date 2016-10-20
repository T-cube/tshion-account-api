/**
 * 微信模板消息
 */
export let templates = {
  approval_result: {
    id: '5SDcb0I1fEPbjpw0KRPzy0-xqmi92jNe5gajq3p32gk',
    title: '审批结果提醒',
    data: '{{first.DATA}}' +
          '审批事项：{{keyword1.DATA}}' +
          '审批结果：{{keyword2.DATA}}' +
          '{{remark.DATA}}'
  }
};

export default function getTemplate(key) {
  return templates[key] && templates[key]['id'];
}
