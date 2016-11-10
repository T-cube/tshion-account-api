import db from 'lib/database';

import UrlHelper from 'models/url-helper';
import {
  COMPANY_MEMBER_INVITE
} from 'models/notification-setting';

export default class EmailSender {

  constructor() {
    this.urlHelper = new UrlHelper();
  }

  send(type, data, extended) {
    let template = this.getTemplate(type);
    if (!template) {
      return null;
    }
    let tplData = this.getData(type, extended);
    return this.getUserEmail(data.to)
    .then(email => {
      return email && this.model('email').send(template, email, tplData);
    });
  }

  getUserEmail(userId) {
    return db.user.findOne({
      _id: userId,
      email_verified: true
    }, {
      email: 1
    })
    .then(doc => doc && doc.email);
  }

  getTemplate(type) {
    switch (type) {
    case COMPANY_MEMBER_INVITE:
      return 'tlifang_email_company_invite';
    }
    return null;
  }

  getData(type, extended) {
    switch (type) {
    case COMPANY_MEMBER_INVITE:
      return {
        from: extended.from.name,
        to: extended.to.name,
        company: extended.company.name,
        url: this.urlHelper.getWebUrl(type, extended),
      };
    }
  }

}
