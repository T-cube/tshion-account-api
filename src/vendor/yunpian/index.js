const request = require('request');
import { NationalVerifySms, VerifySms } from './template';

/**
 * yunpian sdk class
 *
 * @class YunPian
 */
class YunPian {
  static SENDSINGLEINTERNATIONALSMSURL = 'https://sms.yunpian.com/v2/sms/single_send.json'
  static SENDSINGLESMSURL = 'https://sms.yunpian.com/v2/sms/single_send.json'
  static SENDSINGLEVOICECODEURL = 'https://voice.yunpian.com/v2/voice/send.json'

  /**
   * Creates an instance of YunPian.
   * @param {any} { apikey }
   * @memberof YunPian
   */
  constructor({ apikey, sms_signature }) {
    this.apikey = apikey;
    this.signature = sms_signature;

    this.sendingMap = new Map();

    // this.sendSingleInternationalVerifyCode({mobile:'8618705928629',code:4544})
  }

  /**
   * convert phone number to +xxxxx
   *
   * @param {any} mobile
   * @returns {String}
   * @memberof YunPian
   */
  _convertInternationalPhone(mobile) {
    let test_phone = decodeURIComponent(mobile);

    if (!/^\+/.test(test_phone)) test_phone = `+${test_phone}`;
    // return encodeURIComponent(test_phone);

    return test_phone;
  }

  /**
   * send single voice code
   * @param {{}} param0 { url, mobile, text }
   */
  _sendSingleVoiceCode({ url, mobile, text }) {
    return new Promise((resolve, reject) => {
      request.post(url, {
        headers: {
          'Content-Type': 'application/json'
        },
        form: {
          apikey: this.apikey,
          mobile,
          code: text
        }
      }, (err, res, body) => {
        if (err) return reject(err);
        body = JSON.parse(body);
        if (body.code) {
          return reject(body.msg);
        }
        resolve(body);
      })
    });
  }

  /**
   * send single sms
   *
   * @param {any} { url, mobile, text }
   * @returns {Promise}
   * @memberof YunPian
   */
  _sendSingleSms({ url, mobile, text, type }) {
    // 检查是否有正在发送到此手机号的短信
    if (this.sendingMap.has(mobile)) {
      return Promise.reject('mobile_sending')
    }

    // 保存正在发送的列表
    this.sendingMap.set(mobile, 1);

    let promise = null;
    if (type == 'voice') {
      promise = this._sendSingleVoiceCode({ url, mobile, text });
    } else {
      promise = new Promise((resolve, reject) => {
        request.post(url, {
            headers: {
              'Content-Type': 'application/json'
            },
            form: {
              apikey: this.apikey,
              mobile,
              text
            }
          },
          (err, res, body) => {
            // console.log(err, body);
            if (err) return reject(err);

            body = JSON.parse(body);
            if (body.code) {
              return reject(body.msg);
            }
            resolve(body);
          }
        );
      });
    }

    return promise.then(result => {
      // 短信发送结束，移除发送缓存
      this.sendingMap.delete(mobile);
      return result;
    }).catch(error => {
      // 短信发送结束，移除发送缓存
      this.sendingMap.delete(mobile);
      if (error instanceof Error)
        throw error;
      else
        throw new Error(error);
    });
  }

  /**
   * send single international sms
   *
   * @param {any} { mobile, text }
   * @returns {Promise}
   * @memberof YunPian
   */
  sendSingleInternationalSms({ mobile, text }) {
    let url = YunPian.SENDSINGLEINTERNATIONALSMSURL;
    mobile = this._convertInternationalPhone(mobile);

    return this._sendSingleSms({ url, mobile, text });
  }

  sendSingleSms({ mobile, text }) {
    let url = YunPian.SENDSINGLESMSURL;

    return this._sendSingleSms({ url, mobile, text });
  }

  /**
   * send single international verify code sms
   * @param {{}} { mobile, code }
   * @returns {Promise}
   */
  sendSingleInternationalVerifyCode({ mobile, code }) {
    let text = NationalVerifySms(this.signature, code);
    console.log('send sms code: ', mobile, code);
    return this.sendSingleInternationalSms({ mobile, text });
  }

  /**
   * send single voice code
   * @param {{}} { mobile, code }
   * @returns {Promise}
   */
  sendSingleVoiceVerifyCode({ mobile, code }) {
    let url = YunPian.SENDSINGLEVOICECODEURL;
    mobile = this._convertInternationalPhone(mobile);

    return this._sendSingleSms({
      url,
      mobile,
      text: code,
      type: 'voice'
    });
  }

  /**
   * send single verify code sms
   * @param {*} { mobile, code }
   * @returns {Promise}
   */
  sendSingleVerifyCode({ mobile, code }) {
    let text = VerifySms(code);

    return this.sendSingleSms({ mobile, text });
  }
}

export default YunPian;
