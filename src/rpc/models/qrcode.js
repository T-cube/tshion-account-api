import _ from 'underscore';
import Promise from 'bluebird';
import Canvas from 'canvas';
import config from 'config';
import http from 'http';
import Qr from 'qr-image';
import fs from 'fs';

import { BASE_PATH } from 'lib/constants';
import { mapObjectIdToData, fileExists, incId } from 'lib/utils';
import Model from './model';

export default class QrcodeModel extends Model {

  constructor() {
    super();
    this.basePath = BASE_PATH + 'public/cdn/';
  }

  getApiScanUrl(filename) {
    return config.get('apiUrl') + 'cdn/resource/qrcode/' + filename;
  }

  create({name, description}) {
    return incId('qrcode').then(id => {
      return this.requestWechatImg(id)
      .then(doc => {
        let { wechat_url, ticket } = doc;
        let filename = (+new Date()) + '-' + id + '.png';
        let url = this.getApiScanUrl(filename);
        return this.logoQrcode(wechat_url, filename)
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

  update({_id, name, description}) {
    return this.db.qrcode.update({_id}, {
      $set: {
        name,
        description,
      }
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
        return this.createQrWhenNotExists(item.wechat_url, item.filename).then(() => item);
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
      return this.createQrWhenNotExists(item.wechat_url, item.filename).then(() => {
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
      this.db.qrcode.scan.count(condition)
      .then(sum => {
        data.totalRows = sum;
        data.page = page;
        data.pagesize = pagesize;
      }),
      this.db.qrcode.scan.find(condition)
      .sort({
        _id: -1
      })
      .skip(page * pagesize)
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

  createQrWhenNotExists(wechat_url, filename) {
    if (!wechat_url) {
      return Promise.resolve();
    }
    let filepath = this.basePath + 'resource/qrcode/' + filename;
    return fileExists(filepath)
    .then(isExist => {
      if (isExist) {
        return;
      }
      return this.logoQrcode(wechat_url, filename);
    });
  }

  logoQrcode(wechat_url, filename) {

    let filepath = this.basePath + 'resource/qrcode/' + filename;

    return new Promise((resolve, reject) => {

      http.get(wechat_url.replace('https', 'http'), (res) => {
        let qrData = [];
        res.on('data', (chunk) => {
          qrData.push(new Buffer(chunk));
        });
        res.on('end', () => {
          let qrBuffer = Buffer.concat(qrData);
          let img = new Canvas.Image;
          img.src = qrBuffer;
          let imgSize = (img.width && img.width) > 512 ? 512 : img.width;
          let canvas = new Canvas(imgSize, imgSize)
          , ctx = canvas.getContext('2d');

          try {
            ctx.drawImage(img, 0, 0, imgSize, imgSize);   // will fire error in my windows pc
          } catch (e) {
            console.log('canvas draw image error');
            console.error(e);
            fs.writeFile(filepath, qrBuffer, function(err) {
              if (err) {
                console.log('write wechat qrcode error');
                console.error(err);
              }
            });
            return resolve(filepath);
          }

          fs.readFile(this.basePath + 'common/img/qrcode-logo.png', (err, squid) => {
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
      });

    });

  }

  // not use
  createQrImg(url, filename) {

    let filepath = this.basePath + 'resource/qrcode/' + filename;

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


      fs.readFile(this.basePath + 'common/img/qrcode-logo.png', (err, squid) => {
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
