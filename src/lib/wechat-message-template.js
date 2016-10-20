import config from 'config';

/**
 * 微信模板消息
 */
export let templates = {
  approval_result: {
    id: config.get('wechat.templates.approval_result'), 
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
