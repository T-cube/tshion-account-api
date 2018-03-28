import _ from 'underscore';
import config from 'config';
import pad from 'node-string-pad';
import Promise from 'bluebird';

import C, { ENUMS } from 'lib/constants';
import db from 'lib/database';
import { ApiError } from 'lib/error';
import { ValidationError } from 'lib/inspector';
import { generateToken, getEmailName, expire, time } from 'lib/utils';

export default class Account {

  checkExistance(type, account, existsAsValid) {
    return db.user.findOne({
      [type]: account }, { _id: 1, email: 1, mobile: 1 })
      .then(user => {
        if (!_.isUndefined(existsAsValid)) {
          if (user && !existsAsValid) {
            throw new ApiError(400, 'account_exists');
          } else if (!user && existsAsValid) {
            throw new ApiError(400, 'account_not_exists');
          }
        }
        return user;
      });
  }

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
            ])
              .then(() => user._id);
          })
          .then(user_id => {
            return {
              email: doc.email,
              user_id,
            };
          });
      });
  }

  sendCode(type, account, template) {
    if (!_.contains(ENUMS.USER_ID_TYPE, type)) {
      return Promise.reject(new ApiError(400, 'invalid_account_type'));
    }
    if (type == C.USER_ID_TYPE.EMAIL) {
      return this.sendEmailCode(account, template);
    } else {
      return this.sendSmsCode(account, template);
    }
  }

  verifyCode(type, account, code) {
    if (!_.contains(ENUMS.USER_ID_TYPE, type)) {
      return Promise.reject(new ApiError(400, 'invalid_account_type'));
    }
    if (type == C.USER_ID_TYPE.EMAIL) {
      return this.verifyEmailCode(account, code);
    } else {
      return this.verifySmsCode(account, code);
    }
  }

  sendEmailCode(email, template) {
    const { expires } = config.get('userVerifyCode.sms');
    let templateName = 'tlifang_email_bind';
    if (template == 'reset_pass') {
      templateName = 'tlifang_password_recovery';
    }
    return this.genSmsCode()
      .then(code => {
        let userName = getEmailName(email);
        return this.model('email')
          .send(templateName, email, {
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
          throw new ApiError(400, 'verify_code_expired');
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
    let code = pad(Math.round(Math.random() * num) + '', codeLength, 'RIGHT', '0');
    return Promise.resolve(code);
  }

  sendSmsCode(mobile, nation_code = '86') {
    const { expires } = config.get('userVerifyCode.sms');
    return this.genSmsCode()
      .then(code => {
        return this.model('yunpian')
          .sendSingleInternationalVerifyCode({mobile: '' + nation_code + mobile, code})
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

  // sendSmsCode(mobile, template) {
  //   const { expires } = config.get('userVerifyCode.sms');
  //   let templateName = 'tlifang_mobile_bind';
  //   if (template == 'reset_pass') {
  //     templateName = 'tlifang_reset_pass';
  //   }
  //   return this.genSmsCode()
  //   .then(code => {
  //     return this.model('sms')
  //     .send(templateName, mobile, {
  //       code: code,
  //     })
  //     .then(() => {
  //       return db.user.confirm.mobile.insert({
  //         code: code,
  //         mobile: mobile,
  //         expires: expire(expires * 1000),
  //         date_create: time(),
  //       });
  //     });
  //   });
  // }

  verifySmsCode(mobile, code) {
    return db.user.confirm.mobile.findOne({
      mobile: mobile,
      code: code,
    })
      .then(doc => {
        if (!doc) {
          throw new ApiError(400, 'invalid_sms_code');
        }
        if (time() > doc.expires) {
          throw new ApiError(400, 'sms_code_expired');
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

  getToken(type, account) {
    return this.checkExistance(type, account, true)
      .then(user => {
        let userId = user._id;
        return generateToken(48)
          .then(token => {
            let data = {
              user_id: userId,
              token: token,
              expires: expire(60000),
            };
            return db.auth_check_token.update({
              user_id: userId,
            }, data, {
              upsert: true,
            })
              .then(() => {
                console.log(token);
                return token;
              });
          });
      });
  }

  verifyToken(type, account, token) {
    console.log('1111111');
    return this.checkExistance(type, account, true)
      .then(user => {
        let userId = user._id;
        return db.auth_check_token.findOne({
          user_id: userId,
          token: token,
        })
          .then(doc => {
            if (!doc) {
              throw new ApiError('invalid_token');
            }
            if (time() > doc.expires) {
              throw new ApiError('token_expired');
            }
            return userId;
          });
      });
  }

}
