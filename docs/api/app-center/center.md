# 应用中心 API 文档

## 挂载点 /company/:company_id/app-center/

### GET /

获得所有上线APP

OUTPUT:
```javascript
[{
  _id: ObjectId,
  name: <String>,
  icons: {
    '16': <String>,
    '64': <String>,
    '128': <String>,
  },
  author: <String>,
  description: <String>,
}...]
```

### GET /app/:app_id

获得指定app详情

### GET /app

获得公司app列表

### POST /app/:app_id/add

团队拥有者添加app


### PUT /app/:app_id/switch

公司拥有者开启关闭APP

request_body:
```javascript
{
  flag: <Boolean>
}
```

### GET /app/:app_id/options

获取公司APP设置

### PUT /app/:app_id/options

更改公司APP设置


### GET /app/:app_id/comments

获得指定app所有评论

OUTPUT:
```javascript
{
  app_id: ObjectId,
  app_version: <String>,
  user_id: ObjectId,
  star: <Number>,
  content: <String>,
  totalLikes: <Number>,
  isLike: <Boolean>,
}
```

### PUT /app/:app_id/comments/:comment_id/like

点赞评论

### DELETE /app/:app_id/comments/:comment_id/like

取赞评论

### POST /app/:app_id/comments

评论指定APP

request_body:
```javascript
{
  app_version: <String>,
  star: <Number>,
  content: <String>
}
```
