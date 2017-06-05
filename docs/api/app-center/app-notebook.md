# APP notebook API 文档

## request /app-center/app/notebook

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

### GET 获取用户笔记信息

query:

target=user


### GET 获取指定tag_id的所有笔记

query:

tag_id
target=tag

### GET 获取指定note_id的笔记

query:

note_id
target=note

### GET 获取指定notebook_id的笔记

query:

notebook_id
target=notebook

### GET 获取所有分享笔记

query:

target=shared

### GET 获取指定note_id的所有评论

query:

note_id
target=comment


### POST 添加tag

query:

target=tag

body:
```javascript
{
  tag_name: <String>
}
```

### POST 添加notebook

query:

target=notebook

body:
```javascript
{
  notebook_name: <String>
}
```

### POST 添加note

query:

target=note

body:
```javascript
{
  title: <String>,
  content: <String>,
  tags:[],
  notebook:[],
  shared: <Boolean>
}
```

### POST 添加评论

query:

target=comment

body:
```javascript
{
  note_id: <String>,
  content: <String>
}
```

### POST 点赞笔记

query:

note_id
target=like

### DELETE 删除标签

query:

tag_id
target=tag

### DELETE 删除笔记本（同时删除笔记本中所有笔记）

query:

note_id
target=notebook

### DELETE 删除笔记

query：

note_id
target=note

### DELETE 取消点赞

query:

note_id
target=like

### PUT 更改指定标签的标签名

query:

target=tag

body:
```javascript
{
  tag_name: <String>,
  tag_id: <String>
}
```

### PUT 更改指定笔记本的笔记本名

query:

target=notebook

body:
```javascript
{
  notebook_name: <String>,
  notebook_id: <String>
}
```

### PUT 更改笔记

query:

target=note

body:
```javascript
{
  title: <String>,
  content: <String>,
  note_id: <String>
}
```

### PUT 给笔记添加标签

query:

note_id
tag_id
target=noteAddTag

### PUT 给笔记删除标签

query:

note_id
tag_id
target=noteAddTag

### PUT 笔记开启/关闭共享

note_id
target=noteShare
