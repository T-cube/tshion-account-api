module.exports = {
  apiUrl: 'http://192.168.1.22:3000/',
  webUrl: 'http://mtlf.findteachers.cn/',
  mobileUrl: 'http://mtlf.findteachers.cn/',
  database: '127.0.0.1/tlf_core',
  locale: 'zh-CN',
  wechat: {
    token: 'wechat',
    appid: 'wx0215f16935043abf',
    encodingAESKey: 'PuUMhTzz0JxYxV7bGw4aeNJdxXq3CIw2cTRVe56cTgP',
    appsecret: '33e3cc720d35830e154a5eab8bc853d3',
    auth_code_lifetime: 60 * 5,
    templates: {
      APPROVAL_ITEM_RESULT: '5SDcb0I1fEPbjpw0KRPzy0-xqmi92jNe5gajq3p32gk',
      TASK_ASSIGNED: 'D6u6xojT0VG9nffhl9JdcbkKi6FmSd9vfZC9N7tMFBE',
      TASK_DAYLYREPORT: 'M2le2CxHBAdHCHZkqP9JS410XZttonO9p05c9kenlLs',
      REQUEST_ACCEPT: 'onWa4TDALZMy7ZaSpIUXneNzKlUed1UQNL_lq5eZdPA',
      SCHEDULE_REMIND: 'N6tGBD_tAvCDcgGIlgISZ9_3msM6TX5miFhooOXjMRE',
      ATTENDANCE: 'onRwwhajeVIHWW8wp6GlMajKBnmx3frvgni-x5pA5F4',
    }
  },
  rpc: {
    protocol: 'http',
    hostname: '127.0.0.1',
    port: 2002,
    appsecret: 'gvldWZTnQ8BIAReK',
    appid: 'tlf-api'
  },
};
