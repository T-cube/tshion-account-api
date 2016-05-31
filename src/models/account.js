import _ from 'underscore';
import config from 'config';
import pad from 'node-string-pad';
import Promise from 'bluebird';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { generateToken, getEmailName, expire, time } from 'lib/utils';

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
      return this.model('email').send('tlifang_email_active', email, {
        name: userName,
        email: email,
        url: confirmUrl,
      })
      .then(() => {
        return db.user.confirm.email.insert({
          code: code,
          email: email,
          expires: expire(expires * 1000),
          date_create: time(),
        });
      });
    });
  }

  confirmEmailCode(code) {
    return db.user.confirm.email.findOne({
      code: code,
    })
    .then(doc => {
      if (!doc) {
        throw new ApiError(400, 'code_invalid', 'code is not valid');
      }
      console.log(doc);
      if (time() > doc.expires) {
        throw new ApiError(400, 'code_expired', 'code has been expired');
      }
      return db.user.findOne({
        email: doc.email,
      }, {
        email: 1,
      });
    })
    .then(user => {
      if (user.activiated) {
        throw new ApiError(400, 'already_activiated', 'the email has been activiated already');
      }
      return db.user.update({
        _id: user._id,
      }, {
        $set: {
          activiated: true,
        }
      });
    });
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
