import Promise from 'bluebird';

import Model from './model';

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
    let { appid, status } = props;
    return this.db.app.update({
      appid: appid
    }, {
      status: status
    });
  }

  slideshowPage(props) {
    let { page, pagesize, criteria } = props;
    return Promise.all([
      this.db.app.slideshow.count(criteria),
      this.db.app.slideshow.find(criteria, {
        originalname: 1,
        appid: 1,
        status: 1,
      })
      .skip(page * pagesize)
      .sort({_id: -1})
      .limit(pagesize)
    ]).then(([count, list]) => {
      return {
        count,
        list
      };
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
    let { slideshow_id } = props;
    return this.db.app.slideshow.findOne({
      _id: slideshow_id
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
    // return Promise.map(slideshows, slideshow_id => {
    //   return this.db.app.slideshow.find({
    //     _id: slideshow_id
    //   })
    //   .then(doc => {
    //     if (!doc) {
    //       return {};
    //     }
    //     loader.model('document').deleteFile(loader, doc);
    //     return this.db.app.slideshow.remove({_id: slideshow_id});
    //   });
    // });
  }

}
