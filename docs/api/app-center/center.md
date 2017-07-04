# 应用中心 API 文档

## 挂载点 /company/:company_id/app-center/

### GET /app

获得公司app列表
OUTPUT:
```javascript
{
  company_id: ObjectId,
  apps: [{
    appid: String,
    enabled: Boolean,
    name: String,
    icons: {
      '16': <String>,
      '64': <String>,
      '128': <String>,
    },
    version: <String>,
    description: <String>,
  }...]
}
```

### POST /app/:appid/add

团队拥有者添加app


### POST /app/:appid/switch

公司拥有者开启关闭APP

request_body:
```javascript
{
  flag: <Boolean>
}
```

### GET /app/:appid/options

获取公司APP设置

### PUT /app/:appid/options

更改公司APP设置

### DELETE /app/:appid/uninstall

公司拥有者卸载APP，需要登录密码校验


## 挂载点 /app-center/

### GET /app

获得所有上线APP

query:
```javascript
{
  page: Number, //最小为1 页数
  pagesize: Number, //最小为1 每页数量
  type: String, // all 所有的 , new 最新的, top 高分的
}
```

OUTPUT:
```javascript
[{
  _id: ObjectId,
  appid: <String>,
  version: <String>,
  name: <String>,
  name_en: <String>,
  description: <String>,
  icons: {
    '16': <String>,
    '64': <String>,
    '128': <String>,
  },
  author: <String>,
  url: <String>,
  update_info: <String>,
  star: <Number>,
  total_installed: <Number>,
  date_create: <Date>,
  date_update: <Date>,
}...]
```

### GET /store/category

OUTPUT:
```javascript
{
  slideshow: [{
    appid: <String>,
    pic_url: <String>,
  }...],
  new_apps: [{
    _id: ObjectId,
    appid: <String>,
    version: <String>,
    name: <String>,
    name_en: <String>,
    description: <String>,
    icons: {
      '16': <String>,
      '64': <String>,
      '128': <String>,
    },
    author: <String>,
    url: <String>,
    update_info: <String>,
    star: <Number>,
    total_installed: <Number>,
    date_create: <Date>,
    date_update: <Date>,
  }...],
  top_apps: [{
    _id: ObjectId,
    appid: <String>,
    version: <String>,
    name: <String>,
    name_en: <String>,
    description: <String>,
    icons: {
      '16': <String>,
      '64': <String>,
      '128': <String>,
    },
    author: <String>,
    url: <String>,
    update_info: <String>,
    star: <Number>,
    total_installed: <Number>,
    date_create: <Date>,
    date_update: <Date>,
  }...]
}
```

### GET /app/:appid

获得指定app详情

OUTPUT:
```javascript
{
  _id: ObjectId,
  appid: String, // com.tlifang.app.notebook
  name: String, //"note"
  name_en: String,
  version: String, //"0.1.0"
  icons: {
    '16': String,
    '64': String,
    '128': String,
  },
  slideshow: [String, ...],
  author: String, //"foo"
  url: String,
  total_installed: Number,
  description: String, //"this is an incredible note app"
  update_info: String, //"fixed some bugs"
  star: Number, // 4.7  average of this app comment stars
  permissions: [String...],
  dependencies: [String...],
  storage: {
    "mongo": [String...]
  },
  date_create: Date,
}
```

### GET /app/:appid/comment

获得指定app所有评论

OUTPUT:
```javascript
[{
  appid: ObjectId,
  app_version: <String>,
  user_id: ObjectId,
  user_name: <String>,
  user_avatar: <String>,
  star: <Number>,
  content: <String>,
  total_likes: <Number>,
  is_like: <Boolean>,
}...]
```

### PUT /app/:appid/comment/:comment_id/like

点赞评论

### DELETE /app/:appid/comment/:comment_id/like

取赞评论

### POST /app/:appid/comment

评论指定APP

request_body:
```javascript
{
  star: <Number>,
  content: <String>
}
```
