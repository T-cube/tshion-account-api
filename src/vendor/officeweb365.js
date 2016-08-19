import crypto from 'crypto';
import _ from 'underscore';
import qs from 'qs';

export class OfficeWeb365 {

  constructor(config) {
    this.config = _.defaults(config, {
      siteId: null,
      encodeUrl: false,
      cipherKey: null,
      cipherIv: null,
      deleteAfterView: true,
    });
  }

  encryptUrl(url) {
    let cipher = crypto.createCipheriv('des-cbc', this.config.cipherKey, this.config.cipherIv);
    let ciphered1 = cipher.update(url, 'utf8');
    let ciphered2 = cipher.final();
    let cryptedUrl = Buffer.concat([ciphered1, ciphered2]);
    return cryptedUrl.toString('base64').replace('+', '_').replace('/', '@');
  }

  getPreviewUrl(fileUrl, options) {
    options = _.defaults(options || {}, {
      enableSSL: true,
      encodeUrl: this.config.encodeUrl,
      deleteAfterView: this.config.deleteAfterView,
    });
    if (options.encodeUrl) {
      fileUrl = this.encryptUrl(fileUrl);
    }
    let params = {
      i: this.config.siteId,
      furl: fileUrl,
      ssl: options.enableSSL ? 1 : undefined,
      del: this.config.deleteAfterView ? 1 : undefined,
    };
    let protocol = options.enableSSL ? 'https' : 'http';
    let previewUrl = protocol + '://ow365.cn/?' + qs.stringify(params);
    return previewUrl;
  }

}
