var fs = require('fs');

// import enviroment variables from .env
if (!fs.existsSync(__dirname + '/../.env')) {
  console.error('missing .env config file');
  process.exit(1);
}
require('dotenv').config();
// DO NOT REMOVE THIS LINE process.env.NODE_ENV
// DO NOT REMOVE THIS LINE process.env.JZJ_CONFIG

module.exports = {
  apiUrl: 'https://tlifang.com/',
  webUrl: 'https://tlifang.com/',
  mobileUrl: 'https://m.tlifang.com/',
  server: {
    host: '127.0.0.1', // process.env.SERVER_HOST
    port: 3000, // process.env.SERVER_PORT
  },
  allowedOrigins: ['*'],
  debug: {
    format: 'dev', // mongan log format
    httpInfo: false, //process.env.DEBUG_HTTP_INFO
    apiError: false, //process.env.DEBUG_API_ERROR
  },
  rpc: {
    protocol: 'http', // process.env.RPC_PROTOCOL
    hostname: '127.0.0.1', // process.env.RPC_HOSTNAME
    port: 2000, // process.env.RPC_PORT
    appid: process.env.RPC_APPID,
    appsecret: process.env.RPC_APPSECRET,
    trpc: {
      users: {
        'tim': {
          appid: 'tim',
          appsecret: 'S7B6881J8nRRqCjG',
          cluster: true
        }
      }
    },
  },
  database: '127.0.0.1/tlf_core', // process.env.DATABASE
  locale: 'zh-CN',
  // list view config
  view: {
    // list view number
    listNum: 20,
    taskListNum: 10,
    approvalListNum: 10,
    attendRecordNum: 20,
    maxListNum: 100,
    userLoginListNum: 10,
  },
  avatar: {
    count: {
      company: 10,
      project: 32,
      user: 32,
    },
  },
  oauth: {
    accessTokenLifetime: 30 * 60,
    refreshTokenLifetime: 15 * 24 * 3600,
    wechat_client_id: 'com_tlifang_wechat',
  },
  security: {
    passwordHashRounds: 10,
    frequency: {
      userVerifyCode: 60,
    },
    attemptTimes: {
      ipTimes: 150,
      userCaptchaTimes: 3,
      userLockTimes: 10,
      ipTTL: 3600,
      userTTL: 3600
    },
  },
  userVerifyCode: {
    email: {
      codeLength: 24,
      expires: 2 * 24 * 60 * 60, // 2 days in seconds
    },
    sms: {
      codeLength: 6,
      expires: 15 * 60, // 15 minutes in seconds
    },
    captcha: {
      captchaNumber: 4,
      lineNumber: 4,
      circleNumber: 4,
    },
  },
  accountLevel: {
    free: {
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
    ent: {
      max_members: 100,
      max_own_companies: 3,
      store_max_total_size: 2 * 1024 * 1024 * 1024,
      store_max_file_size: 20 * 1024 * 1024,
    },
  },
  upload: {
    path: 'public/cdn/',
    url: 'http://api.tlifang.com/cdn/',
    types: ['avatar', 'attachment', 'plan-auth-pro', 'plan-auth-ent'],
    defaultType: 'attachment',
    allowed: {
      avatar: [
        '.png', '.jpg', '.jpeg', '.gif',
      ],
      'plan-auth-pro': [
        '.png', '.jpg', '.jpeg',
      ],
      'plan-auth-ent': [
        '.png', '.jpg', '.jpeg',
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
    directoryDepth: 3,
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
      weather: {
        appid: process.env.SHOWAPI_APPID,
        secret: process.env.SHOWAPI_SECRET,
      },
    },
    officeweb365: {
      siteId: '10390',
      encodeUrl: true,
      cipherIv: '48467919',
      cipherKey: '20908463',
      deleteAfterView: false,
    },
    qiniu: {
      TOKEN_EXPIRE: 3600,
      TOKEN_CACHE_EXPIRE: 3000,
      ACCESS_KEY: process.env.QINIU_ACCESS_KEY,
      SECRET_KEY: process.env.QINIU_SECRET_KEY,
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
        },
        'cdn-private': {
          name: 'cdn-private-test',
          domain: 'cdn-private-test.tlifang.com',
          https: false,
          private: true,
        }
      }
    },
    sendcloud: {
      email: {
        apiUser: process.env.SENDCLOUD_EMAIL_APIUSER,
        apiKey: process.env.SENDCLOUD_EMAIL_APIKEY,
        url: 'http://api.sendcloud.net/apiv2/mail/sendtemplate',
        from: 'no-reply@mail.tlifang.com',
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
        smsUser: process.env.SENDCLOUD_SMS_SMSUSER,
        smsKey: process.env.SENDCLOUD_SMS_SMSKEY,
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
    appid: process.env.WECHAT_APPID,
    appsecret: process.env.WECHAT_APPSECRET,
    token: process.env.WECHAT_TOKEN,
    encodingAESKey: process.env.WECHAT_ENCODINGAESKEY,
    auth_code_lifetime: 60 * 5,
    templates: {
      APPROVAL_ITEM_RESULT: '5SDcb0I1fEPbjpw0KRPzy0-xqmi92jNe5gajq3p32gk',
      TASK_ASSIGNED: 'D6u6xojT0VG9nffhl9JdcbkKi6FmSd9vfZC9N7tMFBE',
      TASK_DAYLYREPORT: 'M2le2CxHBAdHCHZkqP9JS410XZttonO9p05c9kenlLs',
      REQUEST_ACCEPT: 'onWa4TDALZMy7ZaSpIUXneNzKlUed1UQNL_lq5eZdPA',
      SCHEDULE_REMIND: 'N6tGBD_tAvCDcgGIlgISZ9_3msM6TX5miFhooOXjMRE',
      ATTENDANCE: 'onRwwhajeVIHWW8wp6GlMajKBnmx3frvgni-x5pA5F4',
      APP: '',
    },
    scanurl: 'https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=gQEH8DoAAAAAAAAAASxodHRwOi8vd2VpeGluLnFxLmNvbS9xL1Rqc2hsQkxtVHRzMzRWMTVIUmU4AAIEcmLGVwMEAAAAAA==', // id = 0 的二维码 非正常渠道
  },
  preference: {
    default: {
      'explore.sort_by': '',
      'explore.view_type': '',
      'weather.areaid': '',
      'panel.announcement': true,
      'panel.schedule': true,
      'panel.weather': true,
      new_user_guide_showed: false,
      new_user_approval_guide_showed: false
    }
  },
  plan: {
    max_times: 12,
    trial_times: 1,
    expire_days: 7,
  },
  payment: {
    alipay: {
      APPID: process.env.ALIPAY_APPID,
      KEY: process.env.ALIPAY_KEY,
      PARTNER: process.env.ALIPAY_PARTNER,
      EMAIL: process.env.ALIPAY_EMAIL,
      PRIVATE_KEY: process.env.ALIPAY_PRIVATE_KEY,
    },
    wxpay: {
      APIKEY: process.env.WXPAY_APIKEY,
      APPID: process.env.WXPAY_APPID,
      APPSECRET: process.env.WXPAY_APPSECRET,
      MCHID: process.env.WXPAY_MCHID,
    }
  },
  order: {
    expire_minutes: 30, // order expire
  },
  invoice: {
    min_tax_free_amount: 100000,  // free ship limit
    tax_rate: 2000,               // ship charge under limit
  },
  recharge: {
    amount: {
      min: 100,
      max: 500000,
    }
  },
  sendTask:{
    sms:{
      listName:'smsTask',
      timeout:0,
      pageSize:1000 //节流，防止内存泄露,并且insertMany方法最多一次能插入1000条数据
    },
    email:{

    }
  }
};
