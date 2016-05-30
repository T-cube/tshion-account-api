import _ from 'underscore';
import config from 'config';
import pad from 'node-string-pad';
import Promise from 'bluebird';

import { generateToken, getEmailName, expire, time } from 'lib/utils';
import { ApiError } from 'lib/error';

export default class Account {

  getEmailCode() {
    const { codeLength } = config.get('userConfirm.email');
    return generateToken(codeLength);
  }

  sendConfirmEmail(email) {
    const { expires } = config.get('userConfirm.email');
    return this.getEmailCode()
    .then(code => {
      let confirmUrl = config.get('webUrl') + 'account/confirm/' + code;
      let userName = getEmailName(email);
      this.model('email').send('test_template_active', email, {
        name: userName,
        url: confirmUrl,
      })
      .then(result => {
        db.user.confirm.email.insert({
          code: code,
          email: email,
          expires: expire(expires * 1000),
          date_create: time(),
        });
      });
    });
  }

  confirmEmailCode(code) {
    db.user.confirm.email.findOne({
      code: code,
    })
    .then(doc => {
      if (doc.expires > time()) {
        throw new ApiError(400, 'code_expired', 'code has been expired');
      }
      return db.user.findOne({
        email: doc.email,
      }, {
        email: 1,
      });
    })
    .then(user => {
      if (user.confirmed) {
        throw new ApiError(400, 'already_confirmed', 'the email has been already confirmed')
      }
      db.user.update({
        _id: user._id,
      }, {
        $set: {
          //TODO
        }
      });
    })
  }

  genSmsCode() {
    const { codeLength } = config.get('userConfirm.mobile');
    let num = Math.pow(10, codeLength) - 1;
    let code =  pad(Math.round(Math.random() * num), 6, 'RIGHT', '0');
    return Promise.resolve(code);
  }

  sendSmsCode(mobile) {
    const { expires } = config.get('userConfirm.mobile');
    return this.genSmsCode()
    .then(code => {
      //TODO send code
      db.user.confirm.mobile.insert({
        code: code,
        mobile: mobile,
        expires: expire(expires * 1000),
        date_create: time(),
      });
    });
  }
}
