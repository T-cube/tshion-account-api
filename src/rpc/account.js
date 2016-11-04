import config from 'config';
import Promise from 'bluebird';
import { ApiError } from 'lib/error';

import RpcRoute from 'models/rpc-route';
import db from 'lib/database';
import { mapObjectIdToData } from 'lib/utils';

export default (socket, prefix) => {

  const rpcRoute = new RpcRoute(socket, prefix);
  const route = rpcRoute.route.bind(rpcRoute);

  route('/list', (query) => {
    let { page, pagesize } = query;
    page = page >= 0 ? page : 0;
    pagesize = (pagesize <= config.get('view.maxListNum') && pagesize > 0)
      ? pagesize
      : config.get('view.listNum');
    return Promise.all([
      db.user.count(),
      db.user.find({}, {
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
    let { user } = query;
    if (!user) {
      throw new ApiError(400);
    }
    return db.user.findOne({
      _id: user
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
      user.project_count = user.projects.length;
      delete user.projects;
      return mapObjectIdToData(user, 'company', 'name', 'companies');
    });
  });

};
