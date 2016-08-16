module.exports = {
  apiUrl: 'https://tlifang.com/',
  webUrl: 'https://tlifang.com/',
  database: '127.0.0.1/tlf_core',
  upload: {
    url: 'https://tlifang.com/cdn/',
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
