import _ from 'underscore';
import rp from 'request-promise';
import Promise from 'bluebird';

export class SendCloudError extends Error {
  constructor(message) {
    super();
    this.message = message;
  }
}

export class EmailSender {
  constructor(options) {
    this.options = options;
  }

  checkTemplate(template) {
    const { options } = this;
    return new Promise((resolve, reject) => {
      if (!_.has(options.email.templates, template)) {
        let error = new SendCloudError('invalid email template:', template);
        reject(error);
      } else {
        resolve();
      }
    })
  }

  send(template, to, data) {
    const { options } = this;
    return this.checkTemplate(template)
    .then(() => {
      let _data = _.extend({}, data, {
        to: to,
      });
      return this.sendToMany(template, [_data]);
    })
  }

  sendToMany(template, data) {
    const { options } = this;
    return this.checkTemplate(template)
    .then(() => {
      let formData = {
        apiUser: options.apiUser,
        apiKey: options.apiKey,
        from: options.email.from,
        fromName: options.email.fromName,
        xsmtpapi: this.getApiData(template, data),
        templateInvokeName: template,
      }
      // console.log('sendcloud:', JSON.stringify(formData));
      // return Promise.resolve();
      let params = {
        uri: options.email.url,
        form: formData,
        json: true,
      };
      console.log(params);
      return rp.post(params);
    })
  }

  getApiData(template, data) {
    const { options } = this;
    const { variables } = options.email.templates[template];
    let to = [];
    let sub = {};
    _.each(variables, name => {
      sub[`%${name}%`] = [];
    })
    _.each(data, (item, i) => {
      to.push(item.to);
      _.each(variables, name => {
        sub[`%${name}%`].push(item[name]);
      })
    });
    return JSON.stringify({
      to: to,
      sub: sub,
    });
  }

}

export class SmsSender {
  constructor(options) {
    this.options = options;
  }

  send(template, to, data) {
    const { options } = this;
    if (!_.has(options.email.templates, template)) {
      return Promise.reject(new SendCloudError('invalid email template:', template));
    }
    let _data = _.extend({}, data, {
      to: to,
    });
    return this.sendToMany(template, [_data]);
  }

  sendToMany(template, data) {
    const { options } = this;
    let formData = {
      apiUser: options.apiUser,
      apiKey: options.apiKey,
      from: options.email.from,
      fromName: options.email.fromName,
      xsmtpapi: this.getApiData(template, data),
      templateInvokeName: template,
    }
    // console.log('sendcloud:', JSON.stringify(formData));
    // return Promise.resolve();
    return rp.post({
      uri: options.url,
      form: formData,
      json: true,
    })
    .then(data => console.log(data))
    .catch(e => console.error(e));
  }

  getApiData(template, data) {
    const { options } = this;
    const { variables } = options.email.templates[template];
    let to = [];
    let sub = {};
    _.each(variables, name => {
      sub[`%${name}%`] = [];
    })
    _.each(data, (item, i) => {
      to.push(item.to);
      _.each(variables, name => {
        sub[`%${name}%`].push(item[name]);
      })
    });
    return JSON.stringify({
      to: to,
      sub: sub,
    });
  }

}
