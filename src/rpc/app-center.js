import RpcRoute from 'models/rpc-route';
import { strToReg } from 'lib/utils';
import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp-bluebird';
import uuid from 'uuid';
import db from 'lib/database';
import _ from 'underscore';
import { ObjectId } from 'mongodb';

import AppCenterModel from './models/app-center';
import { APP_ROOT_DIR } from 'bootstrap';
import { validate } from './schema/app-center';

const route = RpcRoute.router();
export default route;

const appCenterModel = new AppCenterModel();

route.on('/app/list', query => {
  let { page, pagesize, keyword, status } = query;
  let criteria = {};
  if (status) {
    criteria.status = status;
  }
  if (keyword) {
    criteria['name'] = {
      $regex: strToReg(keyword, 'i')
    };
  }
  return appCenterModel.page({ page, pagesize, criteria });
});

route.on('/app/info', query => {
  let { app_id } = query;
  let criteria = {
    _id: ObjectId(app_id)
  };
  return appCenterModel.detail({criteria});
});

route.on('/app/info/change', query => {
  validate('app_data', query);
  return db.app.findOne({
    appid: query.appid
  })
  .then(app => {
    if (!app) {
      throw new Error('no_app');
    }
    return appCenterModel.change(query);
  });
});

route.stream('/app/slideshow/upload', (stream, data, loader) => {
  return db.app.findOne({
    appid: data.appid
  })
  .then(app => {
    if (!app) {
      throw new Error('no_app');
    }
    let ext = data.name.split('.')[data.name.split('.').length - 1];
    let uuidName = uuid.v4() + '.' + ext;
    let destination = path.normalize(`${APP_ROOT_DIR}/../public/cdn/upload/attachment/${uuidName[0]}/${uuidName[1]}/${uuidName[2]}`);
    let filepath = `${destination}/${uuidName}`;
    return mkdirp(destination).then(() => {
      let writeStream = fs.createWriteStream(filepath);
      stream.pipe(writeStream);
      return new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
          const qiniu = loader.model('qiniu').bucket('cdn-public');
          let cdn_key = `upload/attachment/${uuidName}`;
          qiniu.upload(cdn_key, filepath).then(qiniu_data => {
            db.app.update({
              appid: data.appid
            }, {
              $push: {
                cdn_keys: cdn_key
              }
            });
            resolve({ url: qiniu_data.url });
          });
        });
      });
    });
  })
  .catch(e => {
    throw new Error(e);
  });
});

route.on('/app/slideshow/delete', (query, loader) => {
  validate('delete_data', query);
  return db.app.findOne({
    appid: query.appid,
  })
  .then(doc => {
    let target_cdn = query.url.split('/');
    let cdn_key = _.find(doc.cdn_keys, item => {
      let i = item.split('/');
      return i[i.length - 1] == target_cdn[target_cdn.length - 1];
    });
    let file;
    if (cdn_key) {
      loader.model('qiniu').bucket('cdn-public').delete(cdn_key).catch(e => console.error(e));
      file = cdn_key.split('/')[cdn_key.split('/').length - 1];
      let destination = path.normalize(`${APP_ROOT_DIR}/../public/cdn/upload/attachment/${file[0]}/${file[1]}/${file[2]}/file`);
      fs.stat(destination, (err, stat) => {
        if (err) console.error(err);
        fs.unlink(destination, e => e && console.error(e));
      });
      return db.app.update({
        appid: query.appid
      }, {
        $pull: {
          cdn_keys: cdn_key,
          slideshow: query.url,
        }
      });
    } else {
      return {};
    }
  })
  .catch(e => {
    throw new Error(e);
  });
});

route.on('/app/status', query => {
  let { app_id, status } = query;
  app_id = ObjectId(app_id);
  return appCenterModel.update({app_id, status});
});

route.on('/slideshow/info', (query, loader) => {
  let { slideshow_id } = query;
  slideshow_id = ObjectId(slideshow_id);
  return appCenterModel.slideshowDetail({slideshow_id, loader});
});

route.on('/slideshow/list', (query, loader) => {
  let { page, pagesize, status } = query;
  let criteria = {};
  if (status) {
    criteria.status = status;
  }
  return appCenterModel.slideshowPage({ page, pagesize, criteria, loader});
});

route.on('/slideshow/status', query => {
  let { slideshow_id, status } = query;
  slideshow_id = ObjectId(slideshow_id);
  return appCenterModel.slideshowUpdate({slideshow_id, status});
});

route.on('/slideshow/delete', (query, loader) => {
  let { slideshow_id } = query;
  slideshow_id = ObjectId(slideshow_id);
  // _.map(slideshows, item => {
  //   item = ObjectId(item);
  //   return item;
  // });
  return appCenterModel.slideshowDelete({slideshow_id, loader});
});

route.stream('/slideshow/upload', (stream, data, loader) => {
  validate('stream_data', data);
  let ext = data.name.split('.')[data.name.split('.').length - 1];
  let uuidName = uuid.v4() + '.' + ext;
  let destination = path.normalize(`${APP_ROOT_DIR}/../public/cdn/upload/attachment/${uuidName[0]}/${uuidName[1]}/${uuidName[2]}`);
  let filepath = `${destination}/uuidName`;
  return mkdirp(destination).then(() => {
    let writeStream = fs.createWriteStream(filepath);
    stream.pipe(writeStream);
    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        const qiniu = loader.model('qiniu').bucket('cdn-file');
        let cdn_key = `upload/attachment/${uuidName}`;
        qiniu.upload(cdn_key, filepath).then(qiniu_data => {
          let slideshow_data = {
            mimetype: data.type,
            fieldname: 'document',
            ext,
            uuidName,
            name: data.name,
            originalname: data.name,
            size: data.size,
            appid: data.appid,
            url: qiniu_data.url,
            cdn_key: cdn_key,
            destination: destination,
            path: destination,
            relpath: `/upload/attachment/${uuidName[0]}/${uuidName[1]}/${uuidName[2]}/${uuidName}`,
            filename: uuidName,
          };
          db.app.slideshow.insert(slideshow_data).then(doc => {
            resolve(doc);
          });
        });
      });
    });
  })
  .catch(e => {
    throw new Error(e);
  });
});
