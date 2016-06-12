import _ from 'underscore';
import config from 'config';
import pad from 'node-string-pad';
import Promise from 'bluebird';

import db from 'lib/database';
import { ApiError } from 'lib/error';
import { generateToken, getEmailName, expire, time } from 'lib/utils';

export default class Account {

  getEmailCode() {
    const { codeLength } = config.get('userVerifyCode.email');
    return generateToken(codeLength);
  }

  sendRegisterEmail(email) {
    const { expires } = config.get('userVerifyCode.email');
    return this.getEmailCode()
    .then(code => {
      let confirmUrl = config.get('webUrl') + 'account/confirm/' + code;
      let userName = getEmailName(email);
      return this.model('email')
      .send('tlifang_email_active', email, {
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

  confirmRegisterEmailCode(code) {
    return db.user.confirm.email.findOne({
      code: code,
    })
    .then(doc => {
      if (!doc) {
        throw new ApiError(400, 'activiate_code_invalid', 'code is not valid');
      }
      console.log(doc);
      if (time() > doc.expires) {
        throw new ApiError(400, 'activiate_code_expired', 'code has been expired');
      }
      return db.user.findOne({
        email: doc.email,
      }, {
        email: 1,
        activiated: 1,
      })
      .then(user => {
        console.log(user);
        if (user.activiated) {
          throw new ApiError(400, 'already_activiated', 'the email has been activiated already');
        }
        return Promise.all([
          db.user.update({
            _id: user._id,
          }, {
            $set: {
              activiated: true,
              email_verified: true,
            }
          }),
          db.user.confirm.email.update({
            _id: doc._id,
          }, {
            $set: {
              expires: new Date(0),
            },
          }),
        ]);
      })
      .then(() => {
        return {
          email: doc.email,
        };
      });
    });
  }

  sendEmailCode(email) {
    const { expires } = config.get('userVerifyCode.sms');
    return this.genSmsCode()
    .then(code => {
      let userName = getEmailName(email);
      return this.model('email')
      .send('tlifang_email_verify', email, {
        name: userName,
        email: email,
        code: code,
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

  verifyEmailCode(email, code) {
    return db.user.confirm.email.findOne({
      email: email,
      code: code,
    })
    .then(doc => {
      if (!doc) {
        throw new ApiError(400, 'verify_code_invalid', 'code is not valid');
      }
      if (time() > doc.expires) {
        throw new ApiError(400, 'verify_code_expired', 'code has been expired');
      }
      return db.user.confirm.email.update({
        _id: doc._id,
      }, {
        $set: {
          expires: new Date(0),
        },
      });
    })
    .then(() => true);
  }

  genSmsCode() {
    const { codeLength } = config.get('userVerifyCode.sms');
    let num = Math.pow(10, codeLength) - 1;
    let code = pad(Math.round(Math.random() * num) + '', 6, 'RIGHT', '0');
    return Promise.resolve(code);
  }

  sendSmsCode(mobile) {
    const { expires } = config.get('userVerifyCode.sms');
    return this.genSmsCode()
    .then(code => {
      return this.model('sms')
      .send('tlifang_mobile_activite', mobile, {
        code: code,
      })
      .then(() => {
        return db.user.confirm.mobile.insert({
          code: code,
          mobile: mobile,
          expires: expire(expires * 1000),
          date_create: time(),
        });
      });
    });
  }

  verifySmsCode(mobile, code) {
    return db.user.confirm.mobile.findOne({
      mobile: mobile,
      code: code,
    })
    .then(doc => {
      if (!doc) {
        throw new ApiError(400, 'sms_code_invalid', 'code is not valid');
      }
      if (time() > doc.expires) {
        throw new ApiError(400, 'sms_code_expired', 'code has been expired');
      }
      return db.user.confirm.mobile.update({
        _id: doc._id,
      }, {
        $set: {
          expires: time(0),
        },
      });
    });
  }
}
