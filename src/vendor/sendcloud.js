import _ from 'underscore';
import rp from 'request-promise';
import Promise from 'bluebird';

export class EmailError extends Error {
  constructor(message) {
    super();
    this.message = message;
  }
}

export default class SendCloud {
  constructor(config) {
    this.config = config;
  }

  send(template, to, data) {
    const { config } = this;
    if (!_.has(config.email.templates, template)) {
      return Promise.reject(new EmailError('invalid email template:', template));
    }
    let _data = _.extend({}, data, {
      to: to,
    });
    return this.sendToMany(template, [_data]);
  }

  sendToMany(template, data) {
    const { config } = this;
    let formData = {
      apiUser: config.apiUser,
      apiKey: config.apiKey,
      from: config.email.from,
      fromName: config.email.fromName,
      xsmtpapi: this.getApiData(template, data),
      templateInvokeName: template,
    }
    console.log('sendcloud:', JSON.stringify(formData));
    return Promise.resolve();
    return rp.post({
      uri: config.url,
      form: formData,
      json: true,
    })
    then(data => console.log(data))
    .catch(e => console.error(e));
  }

  getApiData(template, data) {
    const { config } = this;
    const { variables } = config.email.templates[template];
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
