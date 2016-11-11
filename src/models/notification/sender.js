import UrlHelper from 'models/url-helper';


export default class Sender {

  constructor() {
    this.urlHelper = new UrlHelper();
  }

  // @interface
  send() {}

}
