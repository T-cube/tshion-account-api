# 应用中心 API 文档

## 挂载点 /company/:company_id/app-center/

### GET /

获得所有上线APP

output:
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

### GET /app

获得公司app列表

### GET /app/all

获得所有上线APP及其详情


### GET /company/:company_id/app/list

获取公司APP列表

### GET /company/:company_id/operator/:user_id/app/:app_id/add

公司拥有者添加APP

### POST /company/:company_id/app/:app_id/switch

公司拥有者开启关闭APP

input:
```javascript
{
  flag: <Boolean>
}
```

### GET /company/:company_id/app/:app_id/options

获取公司APP设置

### PUT /company/:company_id/operator/:user_id/app/:app_id/options

更改公司APP设置

### GET /app/:app_id/:user_id/comments

获得指定app所有评论

output:
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

### GET /app/:user_id/comments/:comment_id/like

点赞评论

### GET /app/:user_id/comments/:comment_id/unlike

取赞评论

### POST /app/:app_id/:user_id/comments/create

评论指定APP

input:
```javascript
{
  app_version: <String>,
  star: <Number>,
  content: <String>
}
```
