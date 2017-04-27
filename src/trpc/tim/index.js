'use strict';
let fs = require('fs');

module.exports = function(rpc) {
  addEvent(__dirname, rpc);
};

function addEvent(dir = __dirname, rpc) {
  let folders = fs.readdirSync(dir);

  folders.forEach(function(path) {
    if (path.indexOf('.') < 0) addEvent(`${dir}/${path}`, rpc);

    if (/\.rpc\.js$/.test(path)) {
      const rpcEvents = require(`${dir}/${path}`);
      Object.keys(rpcEvents).forEach(function(routePath, index) {
        let eventPath = `${dir.replace(__dirname,'')}/${routePath}`;
        console.log(`add rpc route ${eventPath}`);

        rpc.on(eventPath, function(obj) {
          rpcEvents[routePath](obj).then(result => {
            rpc.emit(eventPath, { code: 200, data: result });
          }).catch(e => {
            let error = {
              error: e.message
            };
            rpc.emit(eventPath, error);
          });
        });
      });
    }
  });
}
