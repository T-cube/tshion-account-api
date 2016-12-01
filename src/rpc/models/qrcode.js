import _ from 'underscore';
import Promise from 'bluebird';
import Canvas from 'canvas';
import Qr from 'qr-image';
import fs from 'fs';
import config from 'config';

import { BASE_PATH } from 'lib/constants';
import { mapObjectIdToData, fileExists, incId } from 'lib/utils';
import Model from './model';

export default class QrcodeModel extends Model {

  constructor() {
    super();
    this.qrBasePath = BASE_PATH + config.get('resource.path') + 'qrcode/';
  }

  getApiScanUrl(id) {
    return config.get('apiUrl') + 'api/wechat/scan/' + id;
  }

  create({name, description}) {
    return incId('qrcode').then(id => {
      return this.requestWechatImg(id)
      .then(doc => {
        let { wechat_url, ticket } = doc;
        let url = this.getApiScanUrl(id);
        let filename = (+new Date()) + '-' + id + '.png';
        return this.createQrImg(url, filename)
        .then(() => {
          let data = {
            _id: id,
            filename,
            name,
            url,
            description,
            wechat_url,
            ticket,
          };
          return this.db.qrcode.insert(data);
        });
      });
    });
  }

  requestWechatImg(id) {
    return new Promise((resolve, reject) => {
      try {
        let wechatApi = this.model('wechat-util').getWechatApi();
        wechatApi.createLimitQRCode(id, (err, result) => {
          if (err) {
            reject(err);
          }
          let ticket = result.ticket;
          let wechat_url = wechatApi.showQRCodeURL(ticket);
          resolve({wechat_url, ticket});
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  page(props) {
    let { page, pagesize, criteria } = props;
    return Promise.all([
      this.count(criteria),
      this.fetchList(props)
    ])
    .then(doc => {
      let [totalRows, list] = doc;
      return {
        list,
        page,
        pagesize,
        totalRows
      };
    });
  }

  fetchList(props) {
    let { page, pagesize } = props;
    return this.db.qrcode.find({})
    .skip(page * pagesize)
    .limit(pagesize)
    .then(list => {
      return Promise.map(list, item => {
        return this.createQrWhenNotExists(item.url, item.filename).then(() => item);
      });
    })
    .then(scanList => {
      return this.db.qrcode.scan.aggregate([
        {$match: {_id: {$in: scanList.map(item => item._id)}}},
        {$unwind: '$key'},
        {$group : {_id: '$key', sum: {$sum: 1}}}
      ])
      .then(countList => {
        scanList.forEach(scan => {
          let item = _.find(countList, count => count._id == scan._id);
          scan.count = item ? item.sum : 0;
        });
        return scanList;
      });
    });
  }

  count() {
    return this.db.qrcode.count({});
  }

  fetchDetail(_id) {
    return this.db.qrcode.findOne({_id})
    .then(item => {
      if (!item) {
        return null;
      }
      return this.createQrWhenNotExists(item.url, item.filename).then(() => {
        return this.db.qrcode.scan.aggregate([
          {$match: {_id: item._id}},
          {$unwind: '$key'},
          {$group : {_id: '$key', sum: {$sum: 1}}}
        ])
        .then(countList => {
          item.count = countList[0] ? countList[0].sum : 0;
          return item;
        });
      });
    });
  }

  fetchScanUsers(id, options) {
    let { page, pagesize } = options;
    let condition = {
      key: id
    };
    let data = {};
    return Promise.all([
      this.qrcode.scan.from.count(condition)
      .then(sum => {
        data.totalrows = sum;
        data.page = page;
        data.pagesize = pagesize;
      }),
      this.qrcode.scan.from.find(condition)
      .sort({
        _id: -1
      })
      .skip((page - 1) * pagesize)
      .limit(pagesize)
      .then(list => data.list = list)
    ])
    .then(() => {
      return Promise.map(data.list, i => {
        return this.db.wechat.user.findOne({
          _id: i.openid
        })
        .then(wechatInfo => {
          i.wechat_info = wechatInfo;
          i.user_info = wechatInfo && wechatInfo.user_id;
        });
      });
    })
    .then(() => mapObjectIdToData(data.list, 'user', 'name,avatar,email,mobile,birthdate,address', 'user_info'))
    .then(() => data);
  }

  createQrWhenNotExists(url, filename) {
    let filepath = this.qrBasePath + filename;
    return fileExists(filepath)
    .then(isExist => {
      if (isExist) {
        return;
      }
      return this.createQrImg(url, filename);
    });
  }

  createQrImg(url, filename) {

    let filepath = this.qrBasePath + filename;

    return new Promise((resolve, reject) => {

      let qr = Qr.imageSync(url, {
        type: 'png',
        size: 16,
      });
      let img = new Canvas.Image;
      img.src = qr;
      let imgSize = img.width > 512 ? 512 : img.width;
      let canvas = new Canvas(imgSize, imgSize)
      , ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, imgSize, imgSize);


      fs.readFile(this.qrBasePath + 'qrcode-logo.png', (err, squid) => {
        if (err) {
          reject(err);
        }
        let logo = new Canvas.Image;
        logo.src = squid;

        let drawLogoSize = (imgSize / 5) < logo.width ? (imgSize / 5) : logo.width;
        let drawLogoPos = (imgSize - drawLogoSize) / 2;

        ctx.drawImage(logo, drawLogoPos, drawLogoPos, drawLogoSize, drawLogoSize);

        let out = fs.createWriteStream(filepath)
        , stream = canvas.pngStream();
        stream.on('data', (chunk) => {
          out.write(chunk);
        });
        stream.on('end', () => {
          resolve(filepath);
        });
        stream.on('err', () => {
          reject(err);
        });
      });
    });
  }


}
