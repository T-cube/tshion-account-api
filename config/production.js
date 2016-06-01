module.exports = {
  apiUrl: 'https://tlifang.com/',
  webUrl: 'https://tlifang.com/',
  database: '127.0.0.1/tlf_core',
  locale: 'zh-CN',
  upload: {
    path: 'public/cdn/',
    url: 'https://tlifang.com/cdn/',
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

};
