# APP notebook API 文档

## 挂载点 /company/:company_id/app-center/app/notebook


### GET /user 获取用户笔记信息

OUTPUT:
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  company_id: ObjectId,
  tags: [{
    name: <String>,
    _id: ObjectId
  }...],
  notebook: [],
}
```

### GET /tag/:tag_id/note 获取指定tag_id的所有笔记

OUTPUT:
```javascript
[{
  _id: ObjectId,
  user_id: ObjectId,
  company_id: ObjectId,
  title: <String>,
  content: <String>,
  tags: [ObjectId...],
  notebook: ObjectId,
  comments: [ObjectId...],
  likes: [ObjectId...],
  shared: <Boolean>,
  create_date: <Date>,
  update_date: <Date>,  
}...]
```

### GET /note/:note_id 获取指定note_id的笔记

OUTPUT:
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  company_id: ObjectId,
  title: <String>,
  content: <String>,
  tags: [ObjectId...],
  notebook: ObjectId,
  comments: [ObjectId...],
  likes: [ObjectId...],
  shared: <Boolean>,
  create_date: <Date>,
  update_date: <Date>,
}
```

### GET /notebook/:notebook_id 获取指定notebook_id的笔记

OUTPUT:
```javascript
[{
  _id: ObjectId,
  user_id: ObjectId,
  company_id: ObjectId,
  title: <String>,
  content: <String>,
  tags: [ObjectId...],
  notebook: ObjectId,
  comments: [ObjectId...],
  likes: [ObjectId...],
  shared: <Boolean>,
  create_date: <Date>,
  update_date: <Date>,  
}...]
```

### GET /shared 获取团队内所有分享笔记

OUTPUT:
```javascript
[{
  _id: ObjectId,
  user_id: ObjectId,
  company_id: ObjectId,
  title: <String>,
  content: <String>,
  tags: [ObjectId...],
  notebook: ObjectId,
  comments: [ObjectId...],
  likes: [ObjectId...],
  shared: <Boolean>,
  create_date: <Date>,
  update_date: <Date>,  
}...]
```

### GET /note/:note_id/comments 获取指定note_id的所有评论

OUTPUT:
```javascript
[{
  _id: ObjectId,
  note_id: ObjectId,
  user_id: ObjectId,
  company_id: ObjectId,
  content: <String>,
  date_create: <Date>
}...]
```

### POST /tag 添加tag

body:
```javascript
{
  tag_name: <String>
}
```

### POST /notebook 添加notebook

body:
```javascript
{
  notebook_name: <String>
}
```

### POST /note 添加note

body:
```javascript
{
  title: <String>,
  content: <String>,
  tags:[ObjectId...],
  notebook:ObjectId,
  shared: <Boolean>
}
```

### POST /note/:note_id/comment 添加评论

body:
```javascript
{
  comment: <String>
}
```

### POST /note/:note_id/like 点赞笔记

### DELETE /note/:note_id/like 取消点赞

### DELETE /tag/:tag_id 删除标签

### DELETE /notebook/:notebook_id 删除笔记本（同时删除笔记本中所有笔记）

### DELETE /note/:note_id 删除笔记

### PUT /tag/:tag_id 更改指定标签的标签名

body:
```javascript
{
  tag_name: <String>,
}
```

### PUT /notebook/:notebook_id 更改指定笔记本的笔记本名

body:
```javascript
{
  notebook_name: <String>,
}
```

### PUT /note/:note_id 更改笔记

body:
```javascript
{
  title: <String>, //optional
  content: <String>, //optional
  tags: [ObjectId...], //optional
  notebook: ObjectId, //optional
  shared: <Boolean>, //optional
}
```

### POST /note/:note_id/tag/:tag_id 给笔记添加标签

### DELETE /note/:note_id/tag/:tag_id 给笔记删除标签

### PUT /note/:note_id/shared 笔记开启/关闭共享

body:
```javascript
{
  shared: <Boolean>,
}
```
