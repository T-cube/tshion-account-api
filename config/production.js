module.exports = {
  database: '127.0.0.1/tlf_core',
  upload: {
    url: 'https://tlifang.com/cdn/',
  },
  rpc: {
    protocol: 'http',
    hostname: '192.168.1.2',
    port: 2000,
    appsecret: 'gvldWZTnQ8BIAReK',
    appid: 'tlf-api'
  },
  // 正式账号的配置
  wechat: {
    token: 'wechat',
    appid: 'wx7961afad7b487af1',
    encodingAESKey: 'PuUMhTzz0JxYxV7bGw4aeNJdxXq3CIw2cTRVe56cTgP',
    appsecret: '372eb0308edc5a06d437bc3d0a321737',
    auth_code_lifetime: 60 * 5,
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
      ACCESS_KEY: 'f_l5R_bNDR03QjAfqqGy7C3XRuaoMp2qpiHTfAOJ',
      SECRET_KEY: 'Pp7fk2HmH2LUXa7VnUY1Av8FoUQCY_TPeSf_6Y_2',
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
