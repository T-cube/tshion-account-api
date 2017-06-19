module.exports = {
  allowedOrigins: [
    'https://www.tlifang.com',
    'https://tlifang.com',
    'https://m.tlifang.com',
  ],
  database: '127.0.0.1/tlf_core',
  upload: {
    url: 'https://tlifang.com/cdn/',
  },
  rpc: {
    protocol: 'http',
    hostname: '192.168.1.2',
    port: 2000,
    appid: 'tlf-api',
    appsecret: 'gvldWZTnQ8BIAReK',
  },
  // 正式账号的配置
  wechat: {
    templates: {
      APPROVAL_ITEM_RESULT: 'gsYoVNFkxSi7Q9dFeSikaSqHsg5pHURwc-da8RxGghg',
      TASK_ASSIGNED: 'zFCBJwQwHIHW95JsKSXuGJqSgVwvpnokQRbTXPDeKbw',
      TASK_DAYLYREPORT: '0BdmQfgjL3SMv5F7Q6BaciSFw7eaoG7A5vYtHckMlQI',
      REQUEST_ACCEPT: 'Rw2ZZ6ryHMTvYNn-ajO41PP9RiT_qwS2hW3o-giowsw',
      SCHEDULE_REMIND: '6uvplr2mosnDG8VwdKsPw_ANWfuBMzOWUD7xDVVHlc4',
      ATTENDANCE: 'hRzNn-bytk6hjAU0-sh7-0lTN-uloL93c0pfFDTIJKc',
    }
  },
  vendor: {
    qiniu: {
      buckets: {
        'cdn-public': {
          name: 'cdn-public',
          domain: 'cdn-public.tlifang.com',
          https: true,
          private: false,
        },
        'cdn-file': {
          name: 'cdn-file',
          domain: 'cdn-file.tlifang.com',
          https: true,
          private: true,
        },
        'cdn-private': {
          name: 'cdn-private',
          domain: 'cdn-private.tlifang.com',
          https: true,
          private: true,
        }
      }
    },
  }
};
