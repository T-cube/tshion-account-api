module.exports = {
  apiUrl: 'http://web.tlf.test.tlifang.cn/',
  webUrl: 'http://web.tlf.test.tlifang.cn/',
  database: process.env.DATABASE || '192.168.1.18/tlf_core',
  upload: {
    url: 'http://web.tlf.test.tlifang.cn/cdn/',
  },
  rpc: {
    protocol: process.env.RPC_PROTOCOL || 'http',
    hostname: process.env.RPC_HOSTNAME || '192.168.1.18',
    port: process.env.RPC_PORT || 2000,
    appid: process.env.RPC_APPID || 'mayi',
    appsecret: process.env.RPC_APPSECRET || 'Rneo8P6P09u4ZfdZ',
  },
  vendor: {
    officeweb365: {
      siteId: '11137',
      encodeUrl: false,
      deleteAfterView: false,
    },
  }
};
