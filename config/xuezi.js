module.exports = {
  apiUrl: 'http://localhost:3001/',
  webUrl: 'http://oa.tlf.cn/',
  mobileUrl: 'http://mtlf.findteachers.cn/',
  database: '192.168.1.18/tlf_core',
  locale: 'zh-CN',
  wechat: {
    token: 'wechat',
    appid: 'wx0215f16935043abf',
    encodingAESKey: 'PuUMhTzz0JxYxV7bGw4aeNJdxXq3CIw2cTRVe56cTgP',
    appsecret: '33e3cc720d35830e154a5eab8bc853d3',
    auth_code_lifetime: 60 * 5,
    templates: {
      approval_result: '5SDcb0I1fEPbjpw0KRPzy0-xqmi92jNe5gajq3p32gk',
      task_expired: 'A3P5cDmtv7xKqeotk_0AQ5dJFvMXZOa32tqeyZ6AqTA',
      reminding: 'M2le2CxHBAdHCHZkqP9JS410XZttonO9p05c9kenlLs',
    }
  },
  vendor: {
    showapi: {
      weather: {
        appid: '5653',
        secret: 'f668fa7e626043b19b34a61743fcf271'
      }
    }
  }
};
