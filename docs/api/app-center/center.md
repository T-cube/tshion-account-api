# 应用中心 API 文档

## 挂载点 /company/:company_id/app-center/

### GET /

获得所有上线APP

OUTPUT:
```javascript
[{
  _id: ObjectId,
  appid: <String>,
  name: <String>,
  icons: {
    '16': <String>,
    '64': <String>,
    '128': <String>,
  },
  version: <String>,
  author: <String>,
  description: <String>,
}...]
```

### GET /app/:appid

获得指定app详情

### GET /app

获得公司app列表

### POST /app/:appid/add

团队拥有者添加app


### PUT /app/:appid/switch

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


### GET /app/:appid/comments

获得指定app所有评论

OUTPUT:
```javascript
{
  appid: ObjectId,
  app_version: <String>,
  user_id: ObjectId,
  star: <Number>,
  content: <String>,
  total_likes: <Number>,
  is_like: <Boolean>,
}
```

### PUT /app/:appid/comments/:comment_id/like

点赞评论

### DELETE /app/:appid/comments/:comment_id/like

取赞评论

### POST /app/:appid/comments

评论指定APP

request_body:
```javascript
{
  app_version: <String>,
  star: <Number>,
  content: <String>
}
```
