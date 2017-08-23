import Promise from 'bluebird';

import Model from './model';
import { attachFileUrls } from 'routes/company/document/index';

export default class AppCenterModel extends Model {
  constructor(props) {
    super(props);
  }

  fetchList(props) {
    let { page, pagesize, criteria } = props;
    return this.db.app.find(criteria)
    .skip(page * pagesize)
    .sort({_id: -1})
    .limit(pagesize)
    .then(list => {
      return list;
    });
  }

  count(criteria) {
    return this.db.app.count(criteria);
  }

  detail(props) {
    let { criteria } = props;
    return this.db.app.findOne(criteria)
    .then(doc => {
      return doc;
    });
  }

  update(props) {
    let { app_id, status } = props;
    return this.db.app.update({
      _id: app_id
    }, {
      $set: { status: status }
    });
  }

  change(data) {
    let appid = data.appid;
    delete data.appid;
    return this.db.app.update({
      appid,
    }, {
      $set: data
    });
  }

  slideshowPage(props) {
    let { page, pagesize, criteria, loader } = props;
    return Promise.all([
      this.db.app.slideshow.count(criteria),
      this.db.app.slideshow.find(criteria)
      .skip(page * pagesize)
      .sort({_id: -1})
      .limit(pagesize)
    ]).then(([count, slideshows]) => {
      return Promise.map(slideshows, item => {
        return attachFileUrls(loader, item, '46,23')
        .then(() => {
          return item;
        });
      })
      .then(list => {
        return {
          count,
          list
        };
      });
    });
  }

  slideshowUpdate(props) {
    let { slideshow_id, status } = props;
    return this.db.app.slideshow.findOneAndUpdate({
      _id: slideshow_id
    }, {
      $set: { status: status }
    }, {
      returnOriginal: false,
      returnNewDocument: true
    });
  }

  slideshowDetail(props) {
    let { slideshow_id, loader } = props;
    return this.db.app.slideshow.findOne({
      _id: slideshow_id
    }).
    then(doc => {
      return attachFileUrls(loader, doc).then(() => {
        return doc;
      });
    });
  }

  slideshowDelete(props) {
    let { slideshow_id, loader } = props;
    return this.db.app.slideshow.findOne({
      _id: slideshow_id
    })
    .then(doc => {
      if (!doc) {
        return {};
      }
      loader.model('document').deleteFile(loader, doc);
      return this.db.app.slideshow.remove({_id: slideshow_id});
    });
  }

}
