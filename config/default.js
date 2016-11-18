module.exports = {
  apiUrl: 'https://tlifang.com/',
  webUrl: 'https://tlifang.com/',
  mobileUrl: 'https://m.tlifang.com/',
  server: {
    //host: '127.0.0.1',
    port: 3000,
  },
  rpc: {
    protocol: 'http',
    hostname: '127.0.0.1',
    port: 2001,
    username: 'tlf-api',
    password: 'Z#cref=EswuPH=#UHEtRaf+Efa&A7uma',
  },
  database: '127.0.0.1/tlf_core',
  locale: 'zh-CN',
  // 前端展示配置
  view: {
    // 每页默认显式条目数量
    listNum: 20,
    taskListNum: 10,
    approvalListNum: 10,
    attendRecordNum: 20,
    maxListNum: 100,
  },
  passwordHashRounds: 10,
  avatar: {
    count: {
      company: 10,
      project: 24,
      user: 8,
    },
  },
  oauth: {
    accessTokenLifetime: 30 * 60,
    refreshTokenLifetime: 15 * 24 * 3600,
    wechat_client_id: 'com_tlifang_wechat'
  },
  userVerifyCode: {
    email: {
      codeLength: 24,
      expires: 2 * 24 * 60 * 60, // 2 days in seconds
    },
    sms: {
      codeLength: 6,
      expires: 15 * 60, // 15 minutes in seconds
    }
  },
  accountLevel: {
    free: {
      max_members: 100,
      max_own_companies: 3,
      store_max_total_size: 2 * 1024 * 1024 * 1024,
      store_max_file_size: 20 * 1024 * 1024,
    },
    standard: {
      max_members: 100,
      max_own_companies: 3,
      store_max_total_size: 2 * 1024 * 1024 * 1024,
      store_max_file_size: 20 * 1024 * 1024,
    },
    pro: {
      max_members: 100,
      max_own_companies: 3,
      store_max_total_size: 2 * 1024 * 1024 * 1024,
      store_max_file_size: 20 * 1024 * 1024,
    },
  },
  upload: {
    path: 'public/cdn/',
    url: 'http://api.tlifang.com/cdn/',
    types: ['avatar', 'attachment'],
    defaultType: 'attachment',
    allowed: {
      avatar: [
        '.png', '.jpg', '.jpeg', '.gif',
      ],
      attachment: [
        // images
        '.png', '.jpg', '.jpeg', '.gif',
        // pdf
        '.pdf',
        // office
        '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        // wps
        '.wps', '.dps', '.et',
        // plan text
        '.txt',
        // achives
        '.zip', '.rar',
      ],
    },
    document: {
      company: {
        max_total_size: 500 * 1024 * 1024, // 500M
        max_file_size: 10 * 1024 * 1024, // 10M
      },
      project: {
        max_total_size: 500 * 1024 * 1024, // 500M
        max_file_size: 10 * 1024 * 1024, // 10M
      },
    },
    approval_attachment: {
      max_file_size: 10 * 1024 * 1024, // 10M
    },
  },
  vendor: {
    sessionRedis: {
      host: '127.0.0.1',
      port: 6379,
      db: 1,
      prefix: 'sess_',
      ttl: 21600,
    },
    redis: {
      host: '127.0.0.1',
      port: 6379,
      db: 3,
      auth: null,
      retry_max_value: 5,
      prefix: 'tlf_',
    },
    showapi: {
      apiid: 'tlifang_test',
      apikey: '148760960ae44ca29877efbfde7e7551',
    },
    officeweb365: {
      siteId: '10390',
      encodeUrl: true,
      cipherIv: '48467919',
      cipherKey: '20908463',
      deleteAfterView: true,
    },
    qiniu: {
      TOKEN_EXPIRE: 3600,
      TOKEN_CACHE_EXPIRE: 3000,
      ACCESS_KEY: 'f_l5R_bNDR03QjAfqqGy7C3XRuaoMp2qpiHTfAOJ',
      SECRET_KEY: 'Pp7fk2HmH2LUXa7VnUY1Av8FoUQCY_TPeSf_6Y_2',
      buckets: {
        'cdn-public': {
          name: 'cdn-public-test',
          domain: 'cdn-public-test.tlifang.com',
          https: false,
          private: false,
        },
        'cdn-file': {
          name: 'cdn-file-test',
          domain: 'cdn-file-test.tlifang.com',
          https: false,
          private: true,
        }
      }
    },
    sendcloud: {
      email: {
        apiUser: 'tlf_api_production',
        apiKey: 'UjWSflKRRJ52NEVi',
        url: 'http://api.sendcloud.net/apiv2/mail/sendtemplate',
        from: 'no-reply@tlifang.com',
        fromName: 'T立方',
        templates: {
          tlifang_email_active: {
            variables: ['name', 'email', 'url'],
          },
          tlifang_email_bind: {
            variables: ['name', 'email', 'code'],
          },
          tlifang_password_recovery: {
            variables: ['name', 'email', 'code'],
          },
          tlifang_email_company_invite: {
            variables: ['to', 'from', 'company', 'url'],
          },
        },
      },
      sms: {
        smsUser: 'tlifang_sms_prod',
        smsKey: 'MFO8diU8qaqPWxicmFMJRPB7IXn5OEE0',
        url: 'http://sendcloud.sohu.com/smsapi/send',
        templates: {
          tlifang_mobile_activite: {
            id: 1288,
            variables: ['code'],
          },
          tlifang_mobile_bind: {
            id: 1420,
            variables: ['code'],
          },
          tlifang_reset_pass: {
            id: 1289,
            variables: ['code'],
          },
        },
      },
    },
  },
  download: {
    tokenExpires: 30 * 60 * 1000, // half a hour
  },
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
  }
};
