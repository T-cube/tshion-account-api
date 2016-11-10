import config from 'config';
import Promise from 'bluebird';
import { ObjectId } from 'mongodb';
import { ApiError } from 'lib/error';

import RpcRoute from 'models/rpc-route';
import db from 'lib/database';
import { mapObjectIdToData, strToReg } from 'lib/utils';

export default (socket, prefix) => {

  const rpcRoute = new RpcRoute(socket, prefix);
  const route = rpcRoute.route.bind(rpcRoute);

  route('/list', (query) => {
    let { page, pagesize, keyword } = query;
    page = page >= 0 ? page : 0;
    pagesize = (pagesize <= config.get('view.maxListNum') && pagesize > 0)
      ? pagesize
      : config.get('view.listNum');
    let criteria = {};
    if (keyword) {
      criteria['name'] = {
        $regex: strToReg(keyword, 'i')
      };
    }
    return Promise.all([
      db.user.count(criteria),
      db.user.find(criteria, {
        name: 1,
        email: 1,
        email_verified: 1,
        mobile: 1,
        mobile_verified: 1,
        description: 1,
        avatar: 1,
        birthdate: 1,
        sex: 1,
      })
      .skip(page * pagesize)
      .limit(pagesize)
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
  });

  route('/detail', (query) => {
    let { _id } = query;
    if (!_id || !ObjectId.isValid(_id)) {
      throw new ApiError(400);
    }
    return db.user.findOne({
      _id: ObjectId(_id)
    }, {
      name: 1,
      email: 1,
      email_verified: 1,
      mobile: 1,
      mobile_verified: 1,
      description: 1,
      avatar: 1,
      birthdate: 1,
      address: 1,
      sex: 1,
      companies: 1,
      projects: 1,
    })
    .then(user => {
      if (!user) {
        throw new ApiError(404);
      }
      return mapObjectIdToData(user, [
        ['company', 'name', 'companies'],
        ['project', 'name,logo,is_archived', 'projects'],
      ]);
    });
  });

};
