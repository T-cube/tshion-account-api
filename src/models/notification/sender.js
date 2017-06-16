import UrlHelper from 'models/url-helper';


export default class Sender {

  constructor() {
    this.urlHelper = new UrlHelper();
  }

  // @interface
  send() {
    throw new Error('Sender: you need to overide send() method in your subclass');
  }

}
