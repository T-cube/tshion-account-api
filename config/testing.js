module.exports = {
  database: '127.0.0.1/tlf_core',
  locale: 'zh-CN',
  upload: {
    path: 'runtime/upload/',
    url: 'http://192.168.1.18/tlf/upload/',
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
        //'.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        // achives
        //'.zip', '.rar',
      ],
    },
  },
  vendor: {
    qiniu: {
      ACCESS_KEY: 'Tre8EMtc8k5iEg7EmThib_6fGBucIqJYTRRh_Hqx',
      SECRET_KEY: 'U0uoDHEKE3MDEIF3jMoxb7f7G88NIblOd6CZeT_z',
      bucket: 'tlifang',
    }
  }
}
