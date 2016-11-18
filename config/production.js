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
        }
      }
    },
  }
};
