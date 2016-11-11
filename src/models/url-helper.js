import config from 'config';

import {
  APPROVAL_ITEM_RESULT,
  COMPANY_MEMBER_INVITE,
  TASK_ASSIGNED,
  TASK_DAYLYREPORT,
  REQUEST_ACCEPT,
  SCHEDULE_REMIND,
  ATTENDANCE,
} from 'models/notification-setting';

export default class UrlHelper {

  constructor() {
    this.mobileUrl = config.get('mobileUrl');
    this.webUrl = config.get('webUrl');
  }

  getMobileUrl(type, object) {
    let url;
    switch(type) {
    case REQUEST_ACCEPT:
      url = `/oa/company/${object.request.object}/desktop`;
      break;
    case 'project':
      url = `/oa/company/${object.company_id}/desktop/project/${object._id}/list`;
      break;
    case 'project.discussion':
      url = `/oa/company/${object.company_id}/desktop/project/${object.project_id}/list/discuss/${object._id}/detail`;
      break;
    case TASK_ASSIGNED:
      url = `/oa/company/${object.task.company_id}/desktop/project/${object.project._id}/list/task/${object.task._id}/detail`;
      break;
    case COMPANY_MEMBER_INVITE:
      url = '/oa/user/mine/request/all';
      break;
    case APPROVAL_ITEM_RESULT:
      url = `oa/company/${object.approval_item.company_id}/feature/approval/detail/${object.approval_item._id}`;
      break;
    case 'document.dir':
      if (object.project_id) {
        url = `/oa/company/${object.company_id}/desktop/project/${object.project_id}/list/file/dir/${object._id}`;
      } else {
        url = `/oa/company/${object.company_id}/feature/knowledge/dir/${object._id}`;
      }
      break;
    case 'document.file':
      if (object.project_id) {
        url = `/oa/company/${object.company_id}/desktop/project/${object.project_id}/list/file/check/${object._id}`;
      } else {
        url = `/oa/company/${object.company_id}/feature/knowledge/check/${object._id}`;
      }
      break;
    case 'announcement':
    case 'announcement.draft':
      url = `/oa/company/${object.company_id}/feature/announcement/${object.type}/${object._id}`;
      break;
    case SCHEDULE_REMIND:
      url = '`/oa/company';
      break;
    case ATTENDANCE:
      url = `/oa/company/${object.company._id}/feature/attend`;
      break;
    case 'default':
      url = null;
    }
    if (/undefined/.test(url)) {
      return null;
    }
    return this.mobileUrl.substr(0, this.mobileUrl.length - 1) + url;
  }

  getWebUrl(type, object) {
    let url;
    switch(type) {
    case REQUEST_ACCEPT:
      url = `/oa/company/${object.request.object}`;
      break;
    case 'project':
      url = `/oa/company/${object.company_id}/project/${object._id}`;
      break;
    case 'project.discussion':
      url = `/oa/company/${object.company_id}/project/${object.project_id}/discuss/detail/${object._id}`;
      break;
    case TASK_ASSIGNED:
      url = `/oa/company/${object.task.company_id}/project/${object.project._id}/task/filter/all/detail/${object.task._id}`;
      break;
    case COMPANY_MEMBER_INVITE:
      url = '/oa/user/request/all';
      break;
    case APPROVAL_ITEM_RESULT:
      url = `/oa/company/${object.approval_item.company_id}/approval/check/${object.approval_item._id}`;
      break;
    case 'approval.template':
      url = `/oa/company/${object.company_id}/approval/setting/template/${object._id}`;
      break;
    case 'document.dir':
      if (object.project_id) {
        url = `/oa/company/${object.company_id}/project/${object.project_id}/file/dir/${object._id}`;
      } else {
        url = `/oa/company/${object.company_id}/knowledge/dir/${object._id}`;
      }
      break;
    case 'document.file':
      if (object.project_id) {
        url = `/oa/company/${object.company_id}/project/${object.project_id}/file/file/${object._id}`;
      } else {
        url = `/oa/company/${object.company_id}/knowledge/file/${object._id}`;
      }
      break;
    case 'announcement':
      url = `/oa/company/${object.company_id}/announcement/${object.type}/${object._id}`;
      break;
    case 'announcement.draft':
      url = `/oa/company/${object.company_id}/announcement/drafts/${object._id}/edit`;
      break;
    case SCHEDULE_REMIND:
      url = '/oa/user/schedule';
      break;
    case ATTENDANCE:
      url = `/oa/company/${object.company._id}/attendance`;
      break;
    case 'default':
      url = null;
    }
    if (/undefined/.test(url)) {
      return null;
    }
    return this.webUrl.substr(0, this.webUrl.length - 1) + url;
  }

}
