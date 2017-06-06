# APP notebook API 文档

## 挂载点 /app-center/app/notebook

query:
```javascript
{
  target: <String>, // ['user', 'tag', 'note', 'like', 'notebook', 'shared', 'comment', 'note', 'noteAddTag', 'noteDeleteTag', 'noteShare']
  user_id: <String>,
  company_id: <String>,
  note_id: <String>, //optional
  tag_id: <String>,  //optional
}
```

### GET /user 获取用户笔记信息

query:
```javascript
{
  company_id: <String>,
  app_id: <String>,
}
```

### GET /tag 获取指定tag_id的所有笔记

query:
```javascript
{
  company_id: <String>,
  app_id: <String>,
  tag_id: <String>
}
```

### GET /note 获取指定note_id的笔记

query:
```javascript
{
  company_id: <String>,
  app_id: <String>,
  note_id: <String>,
}
```

### GET /notebook 获取指定notebook_id的笔记

query:
```javascript
{
  company_id: <String>,
  app_id: <String>,
  notebook_id: <String>,
}
```

### GET /shared 获取团队内所有分享笔记

query:
```javascript
{
  company_id: <String>,
  app_id: <String>,
}
```

### GET /comment 获取指定note_id的所有评论

query:
```javascript
{
  company_id: <String>,
  app_id: <String>,
  note_id: <String>,  
}
```


### POST /tag 添加tag

query:
```javascript
{
  company_id: <String>,
  app_id: <String>,
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
  company_id: <String>,
  app_id: <String>,
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
  company_id: <String>,
  app_id: <String>,
}
```
body:
```javascript
{
  title: <String>,
  content: <String>,
  tags:[],
  notebook:<String>,
  shared: <Boolean>
}
```

### POST /comment 添加评论

query:
```javascript
{
  company_id: <String>,
  app_id: <String>,
}
```
body:
```javascript
{
  note_id: <String>,
  content: <String>
}
```

### POST /like 点赞笔记

query:
```javascript
{
  company_id: <String>,
  app_id: <String>,
  note_id: <String>,
}
```

### DELETE /tag 删除标签

query:
```javascript
{
  company_id: <String>,
  app_id: <String>,
  tag_id: <String>,
}
```

### DELETE /notebook 删除笔记本（同时删除笔记本中所有笔记）

query:
```javascript
{
  company_id: <String>,
  app_id: <String>,
  notebook_id: <String>,  
}
```

### DELETE /note 删除笔记

query:
```javascript
{
  company_id: <String>,
  app_id: <String>,
  note_id: <String>,  
}
```

### DELETE /like 取消点赞

query:
```javascript
{
  company_id: <String>,
  app_id: <String>,
  note_id: <String>,  
}
```

### PUT /tag 更改指定标签的标签名

query:
```javascript
{
  company_id: <String>,
  app_id: <String>,
}
```
body:
```javascript
{
  tag_name: <String>,
  tag_id: <String>
}
```

### PUT /notebook 更改指定笔记本的笔记本名

query:
```javascript
{
  company_id: <String>,
  app_id: <String>,
}
```
body:
```javascript
{
  notebook_name: <String>,
  notebook_id: <String>
}
```

### PUT /note 更改笔记

query:
```javascript
{
  company_id: <String>,
  app_id: <String>,
}
```
body:
```javascript
{
  title: <String>,
  content: <String>,
  note_id: <String>
}
```

### PUT /note/add/tag 给笔记添加标签

query:
```javascript
{
  company_id: <String>,
  app_id: <String>,
  tag_id: <String>,
  note_id: <String>,
}
```

### PUT /note/delete/tag 给笔记删除标签

query:
```javascript
{
  company_id: <String>,
  app_id: <String>,
  tag_id: <String>,
  note_id: <String>,
}
```

### PUT /note/shared 笔记开启/关闭共享

query:
```javascript
{
  company_id: <String>,
  app_id: <String>,
  note_id: <String>,
}
```
body:
```javascript
{
  shared: <Boolean>,
}
```
