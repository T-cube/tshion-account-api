module.exports = {
  apiUrl: 'http://tlifang.com/',
  webUrl: 'http://tlifang.com/',
  server: {
    //host: '127.0.0.1',
    port: 3000,
  },
  database: '127.0.0.1/tlf_core',
  locale: 'zh-CN',
  // 前端展示配置
  view: {
    // 每页默认显式条目数量
    listNum: 20,
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
  upload: {
    path: 'public/cdn/',
    url: 'http://api.tlifang.com/cdn/',
    types: ['avatar', 'attachment'],
    defaultType: 'attachment',
    allowed: {
      avatar: [
        '.png', '.jpg', '.gif',
      ],
      attachment: [
        // images
        '.png', '.jpg', '.gif',
        // pdf
        '.pdf',
        // office
        '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
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
    qiniu: {
      ACCESS_KEY: 'Tre8EMtc8k5iEg7EmThib_6fGBucIqJYTRRh_Hqx',
      SECRET_KEY: 'U0uoDHEKE3MDEIF3jMoxb7f7G88NIblOd6CZeT_z',
      bucket: 'tlifang',
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
};
