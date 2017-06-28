# APP notebook API 文档

## 挂载点 /company/:company_id/app/com.tlifang.notebook


### GET /user

获取用户笔记信息

OUTPUT:
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  company_id: ObjectId,
  tags: [{
    name: <String>,
    total: <Number>,
    _id: ObjectId
  }...],
  notebooks: [{
    name: <String>,
    total: <Number>,
    _id: ObjectId
  }...],
}
```

### GET /note

获取所有笔记
query:
```javascript
{
  last_id: objectId, //optional, 分页处理，为上一页最后一个笔记的id
  sort_type: <String>, //title, date_update, notebook, date_create
}
```

### GET /tag/:tag_id/note

获取指定tag_id的所有笔记
query:
```javascript
{
  last_id: objectId, //optional, 分页处理，为上一页最后一个笔记的id
  sort_type: <String>, //title, date_update, notebook, date_create
}
```

OUTPUT:
```javascript
[{
  _id: ObjectId,
  title: <String>,
  content: <String>,
  tags: [ObjectId...],
  notebook: ObjectId,
  comments: [ObjectId...],
  likes: [ObjectId...],
  shared: <Boolean>,
  date_create: <Date>,
  date_update: <Date>,  
}...]
```

### GET /note/:note_id

获取指定note_id的笔记

OUTPUT:
```javascript
{
  _id: ObjectId,
  title: <String>,
  content: <String>,
  tags: [ObjectId...],
  notebook: ObjectId,
  comments: [ObjectId...],
  likes: [ObjectId...],
  shared: <Boolean>,
  date_create: <Date>,
  date_update: <Date>,
}
```

### GET /notebook/:notebook_id/note

获取指定notebook_id的笔记
query:
```javascript
{
  last_id: objectId, //optional, 分页处理，为上一页最后一个笔记的id
  sort_type: <String>, //title, date_update, notebook, date_create
}
```

OUTPUT:
```javascript
[{
  _id: ObjectId,
  title: <String>,
  content: <String>,
  tags: [ObjectId...],
  notebook: ObjectId,
  comments: [ObjectId...],
  likes: [ObjectId...],
  shared: <Boolean>,
  date_create: <Date>,
  date_update: <Date>,  
}...]
```

### GET /shared

获取团队内所有分享笔记

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
  date_create: <Date>,
  date_update: <Date>,  
}...]
```

### GET /note/:note_id/comments

获取指定note_id的所有评论

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

### POST /tag

添加tag

request_body:
```javascript
{
  name: <String>
}
```

OUTPUT:
```javascript
{
  name: <String>, // tag_name
  _id: ObjectId, // tag_id
}
```

### POST /notebook

添加notebook

request_body:
```javascript
{
  name: <String>
}
```

OUTPUT:
```javascript
{
  name: <String>, // notebook_name
  _id: ObjectId, // notebook_id
}
```

### POST /note

添加note

request_body:
```javascript
{
  title: <String>,
  content: <String>,
  tags:[ObjectId...],
  notebook:ObjectId,
  shared: <Boolean>
}
```

### POST /note/:note_id/comments

添加评论

request_body:
```javascript
{
  comment: <String>
}
```

### POST /note/:note_id/like



点赞笔记

### DELETE /note/:note_id/like



取消点赞

### DELETE /tag/:tag_id



删除标签

### DELETE /notebook/:notebook_id



删除笔记本（同时删除笔记本中所有笔记）

### DELETE /note/:note_id



删除笔记

### PUT /tag/:tag_id

更改指定标签的标签名

request_body:
```javascript
{
  name: <String>,
}
```

### PUT /notebook/:notebook_id

更改指定笔记本的笔记本名

request_body:
```javascript
{
  name: <String>,
}
```

### PUT /note/:note_id

更改笔记

request_body:
```javascript
{
  title: <String>, //optional
  content: <String>, //optional
  notebook: ObjectId, //optional
  shared: <Boolean>, //optional
}
```

### POST /note/:note_id/tag

给笔记添加标签

request_body:
```javascript
{
  tag_id: ObjectId
}
```

### DELETE /note/:note_id/tag

给笔记删除标签
request_body:
```javascript
{
  tag_id: ObjectId
}
```

### PUT /note/:note_id/shared

笔记开启/关闭共享

request_body:
```javascript
{
  shared: <Boolean>,
}
```
