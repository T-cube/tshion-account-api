import RpcRoute from 'models/rpc-route';
import { strToReg } from 'lib/utils';
import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp-bluebird';
import uuid from 'uuid';

import AppCenterModel from './models/app-center';
import { APP_ROOT_DIR } from 'bootstrap';
import { getObjectId } from './utils';

const route = RpcRoute.router();
export default route;

const appCenterModel = new AppCenterModel();

route.on('/app/list', query => {
  let { page, pagesize, keyword, enabled } = query;
  let criteria = {};
  if (enabled) {
    criteria.enabled = enabled;
  }
  if (keyword) {
    criteria['name'] = {
      $regex: strToReg(keyword, 'i')
    };
  }
  return appCenterModel.page({ page, pagesize, criteria });
});

route.on('/app/enabled', query => {
  let { appid, enabled } = query;
  return appCenterModel.update({appid, enabled});
});

route.on('/slideshow/list', query => {
  let { page, pagesize, active } = query;
  let criteria = {};
  if (active) {
    criteria.active = active;
  }
  return appCenterModel.slideshowPage({ page, pagesize, criteria});
});

route.on('/slideshow/actived', query => {
  let { slideshow_id, active } = query;
  slideshow_id = getObjectId(slideshow_id);
  return appCenterModel.slideshowUpdate({ slideshow_id, active});
});

route.stream('/slideshow/upload', (stream, data, loader) => {
  let ext = data.name.split('.')[data.name.split('.').length - 1];
  let uuidName = uuid.v4() + '.' + ext;
  let destination = path.normalize(`${APP_ROOT_DIR}/../public/cdn/upload/attachment/${uuidName[0]}/${uuidName[1]}/${uuidName[2]}`);
  let filepath = `${destination}/uuidName`;
  return mkdirp(destination).then(() => {
    let writeStream = fs.createWriteStream(filepath);
    stream.pipe(writeStream);
    writeStream.on('finish', () => {
      const qiniu = loader.model('qiniu').bucket('cdn-public');
      let cdn_key = `upload/attachment/${uuidName}`;
      return qiniu.upload(cdn_key, filepath).then(qiniu_data => {
        let slideshow_data = {
          mimetype: data.type,
          ext,
          uuidName,
          originalname: data.name,
          size: data.size,
          appid: data.appid,
          url: qiniu_data.url,
          cdn_key: cdn_key,
          destination: destination,
          relpath: `/upload/attachment/${uuidName[0]}/${uuidName[1]}/${uuidName[2]}/${uuidName}`,
          filename: uuidName,
        };
        return this.db.slideshow.insert(slideshow_data);
      });
    });
  })
  .catch(e => {
    throw new Error(e);
  });
});
