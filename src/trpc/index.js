'use strict';

const fs = require('fs');

module.exports = function(rpc) {

  const map = process.rpcMap = new Map();
  const DEFAULT = 'tim';

  rpc.on('connect', info => {
    let { appid, rpc } = info;
    let socket = map.get(appid);
    if (!socket) map.set(appid, { appid, socket: rpc, connectAt: new Date(), connectCount: 1 });
    else {
      if (process.rpc && (socket.socket.socket.id == process.rpc.socket.id)) {
        process.rpc = global.rpcMap.get(appid);
      }

      socket.reconnectAt = new Date(), socket.connectCount++, socket.socket = global.rpcMap.get(appid);
      map.set(appid, socket);
    }

    if (appid == DEFAULT && !process.rpc) process.rpc = global.rpcMap.get(appid);

    let _dir = `${__dirname.replace(/\\/g,'/')}/${appid}`;
    fs.existsSync(_dir) && require(_dir)(rpc);
  });

  rpc.on('disconnect', info => {
    let { appid } = info;
    console.log(`rpc ${appid} disconnect`);
  });
};
