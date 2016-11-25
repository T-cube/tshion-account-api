import C from 'lib/constants';

export default class Payment {

  constructor() {
    this.methods = {
      alipay: {},
      wechat: {},
    };
  }

  getMethods() {
    return this.methods;
  }

  getInstance(method) {
    return this.methods[method].instance;
  }

}
