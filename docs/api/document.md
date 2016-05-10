# API Document

[返回目录](index.md)

文档，知识

## 挂载点

```
/company/:company_id
```

## Table of Contents

...

## document dir

文档目录

### POST /document

添加目录

INPUT

```javascript
{
  name: <String>,
  parent_dir: <ObjectId> // 为null时根目录
}
```

### GET /document/:dir_id?

获取目录名和子目录

OUTPUT:
```javascript
{
  _id: <ObjectId>,
  name: <String>,
  children: [{
    _id: <ObjectId>,
    name: <String>,
  }]
}
```

### PUT /document/:dir_id

修改目录名

INPUT:
```javascript
{
  name: <String>,
}
```

### DELETE /document/:dir_id

删除目录

## document file

文档文件

### POST /document/:dir_id/file

添加文档

INPUT:
```javascript
{
  title: <String>,
  description: <String>,
  content: <String>,
  document: <File>,
}
```

### GET /document/:dir_id/file

获取文档列表

OUTPUT:
```javascript
{
  _id: <ObjectId>,
  title: <String>,
  description: <String>,
  author: <String>,
  date_update: <Date>,
  mimetype: <String>,
  path: <String>,
}
```

### GET /document/:dir_id/file/:file_id

获取文档详情

OUTPUT:
```javascript
{
  _id: <ObjectId>,
  title: <String>,
  description: <String>,
  author: <String>,
  content: <String>,
  date_update: <Date>,
  path: <String>,
}
```

### GET /document/:dir_id/file/:file_id/download

下载文档

OUTPUT:
```javascript
<File>
```

### DELETE /document/:dir_id/file/:file_id

删除文档
