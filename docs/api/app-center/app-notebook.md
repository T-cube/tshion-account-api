# APP notebook API 文档

## 挂载点 /app-center/app/notebook


### GET /user 获取用户笔记信息

query:
```javascript
{
  company_id: ObjectId,
  app_id: ObjectId,
}
```

### GET /tag 获取指定tag_id的所有笔记

query:
```javascript
{
  company_id: ObjectId,
  app_id: ObjectId,
  tag_id: ObjectId
}
```

### GET /note 获取指定note_id的笔记

query:
```javascript
{
  company_id: ObjectId,
  app_id: ObjectId,
  note_id: ObjectId,
}
```

### GET /notebook 获取指定notebook_id的笔记

query:
```javascript
{
  company_id: ObjectId,
  app_id: ObjectId,
  notebook_id: ObjectId,
}
```

### GET /shared 获取团队内所有分享笔记

query:
```javascript
{
  company_id: ObjectId,
  app_id: ObjectId,
}
```

### GET /comment 获取指定note_id的所有评论

query:
```javascript
{
  company_id: ObjectId,
  app_id: ObjectId,
  note_id: ObjectId,  
}
```


### POST /tag 添加tag

query:
```javascript
{
  company_id: ObjectId,
  app_id: ObjectId,
}
```
body:
```javascript
{
  tag_name: <String>
}
```

### POST /notebook 添加notebook

query:
```javascript
{
  company_id: ObjectId,
  app_id: ObjectId,
}
```
body:
```javascript
{
  notebook_name: <String>
}
```

### POST /note 添加note

query:
```javascript
{
  company_id: ObjectId,
  app_id: ObjectId,
}
```
body:
```javascript
{
  title: <String>,
  content: <String>,
  tags:[ObjectId],
  notebook:ObjectId,
  shared: <Boolean>
}
```

### POST /comment 添加评论

query:
```javascript
{
  company_id: ObjectId,
  app_id: ObjectId,
}
```
body:
```javascript
{
  note_id: ObjectId,
  content: <String>
}
```

### POST /like 点赞笔记

query:
```javascript
{
  company_id: ObjectId,
  app_id: ObjectId,
  note_id: ObjectId,
}
```

### DELETE /tag 删除标签

query:
```javascript
{
  company_id: ObjectId,
  app_id: ObjectId,
  tag_id: ObjectId,
}
```

### DELETE /notebook 删除笔记本（同时删除笔记本中所有笔记）

query:
```javascript
{
  company_id: ObjectId,
  app_id: ObjectId,
  notebook_id: ObjectId,  
}
```

### DELETE /note 删除笔记

query:
```javascript
{
  company_id: ObjectId,
  app_id: ObjectId,
  note_id: ObjectId,  
}
```

### DELETE /like 取消点赞

query:
```javascript
{
  company_id: ObjectId,
  app_id: ObjectId,
  note_id: ObjectId,  
}
```

### PUT /tag 更改指定标签的标签名

query:
```javascript
{
  company_id: ObjectId,
  app_id: ObjectId,
}
```
body:
```javascript
{
  tag_name: <String>,
  tag_id: ObjectId
}
```

### PUT /notebook 更改指定笔记本的笔记本名

query:
```javascript
{
  company_id: ObjectId,
  app_id: ObjectId,
}
```
body:
```javascript
{
  notebook_name: <String>,
  notebook_id: ObjectId
}
```

### PUT /note 更改笔记

query:
```javascript
{
  company_id: ObjectId,
  app_id: ObjectId,
}
```
body:
```javascript
{
  title: <String>,
  content: <String>,
  note_id: ObjectId
}
```

### PUT /note/add/tag 给笔记添加标签

query:
```javascript
{
  company_id: ObjectId,
  app_id: ObjectId,
  tag_id: ObjectId,
  note_id: ObjectId,
}
```

### PUT /note/delete/tag 给笔记删除标签

query:
```javascript
{
  company_id: ObjectId,
  app_id: ObjectId,
  tag_id: ObjectId,
  note_id: ObjectId,
}
```

### PUT /note/shared 笔记开启/关闭共享

query:
```javascript
{
  company_id: ObjectId,
  app_id: ObjectId,
  note_id: ObjectId,
  shared: <Boolean>,
}
```
