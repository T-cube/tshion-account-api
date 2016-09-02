// HTML helper, convert CDN links

import _ from 'underscore';
import escapeRegexp from 'escape-regexp';
import config from 'config';
import Promise from 'bluebird';
import sanitizeHtml from 'sanitize-html';

export default class HtmlHelper {

  constructor() {
  }

  encodeHTML(text) {
    return text.replace(/&/g, '&amp;');
  }

  decodeHTML(text) {
    return text.replace(/&amp;/g, '&');
  }

  init() {
    const qiniuUtil = this.model('qiniu');
    let cdnBuckets = config.get('vendor.qiniu.buckets');
    this.cdnUrlPatterns = _.map(cdnBuckets, (bucket, key) => {
      let cfg = qiniuUtil.getBucketConfig(key);
      return new RegExp(`(${escapeRegexp(cfg.baseUrl)}[\\w\\-\\/\\.]+)(\\?[\\w\\-\\=\\:\\./&;]+)?`, 'g');
    });
  }

  sanitize(html) {
    if (!_.isString(html)) {
      return '';
    }
    _.each(this.cdnUrlPatterns, pattern => {
      html = html.replace(pattern, '$1');
    });
    html = sanitizeHtml(html);
    return Promise.resolve(html);
  }

  prepare(html) {
    const qiniu = this.model('qiniu').bucket('cdn-file');
    let promises = [];
    _.each(this.cdnUrlPatterns, pattern => {
      let match = pattern.exec(html);
      let founds = [];
      let replaces = [];
      while(match) {
        founds.push(match[0]);
        replaces.push(this.decodeHTML(match[1]));
        match = pattern.exec(html);
      }
      let promise = Promise.map(replaces, url => qiniu.makeLink(url))
      .then(links => {
        _.each(founds, (found, i) => {
          html = html.replace(found, this.encodeHTML(links[i]));
        });
      });
      promises.push(promise);
    });
    return Promise.all(promises).then(() => html);
  }
}
