import config from 'config';

import RpcRoute from 'models/rpc-route';
import db from 'lib/database';
import { mapObjectIdToData } from 'lib/utils';

export default (socket, prefix) => {

  const rpcRoute = new RpcRoute(socket, prefix);
  const route = rpcRoute.route.bind(rpcRoute);

  route('/list', (query) => {
    let { page, pagesize } = query;
    page = page || 1;
    pagesize = (pagesize <= config.get('view.maxListNum') && pagesize > 0)
      ? pagesize
      : config.get('view.listNum');
    return db.user.find({}, {
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
    .skip((page - 1) * pagesize)
    .limit(pagesize);
  });

  route('/detail', (query) => {
    let { user } = query;
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
      user.project_count = user.projects.length;
      delete user.projects;
      return mapObjectIdToData(user, 'company', 'name', 'companies');
    });
  });

};
