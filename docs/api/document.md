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

### POST /document/dir

添加目录

INPUT

```javascript
{
  name: <String>,
  parent_dir: <ObjectId>
}
```

### GET /document/dir/:dir_id?

获取目录名和子目录和文件

OUTPUT:
```javascript
{
  _id: <ObjectId>,
  name: <String>,
  dirs: [{
    _id: <ObjectId>,
    name: <String>,
  }],
  files: [{
    _id: <ObjectId>,
    name: <String>,
    mimetype: <String>,
    size: <Number>,
  }...],
  path: [{
    _id: <ObjectId>,
    name: <String>,
  }...],
  updated_by: <ObjectId>,
  date_update: <Date>，
  date_create: <Date>，
}
```

### PUT /document/dir/:dir_id/name

修改目录名

INPUT:
```javascript
{
  name: <String>,
}
```

### DELETE /document

删除目录和文件

INPUT
```javascript
{
  dirs: [<ObjectId>...],
  files: [<ObjectId>...],
}
```

## document file

文档文件

### POST /document/dir/:dir_id/upload

添加文件

INPUT:
```javascript
{
  document: <File[multiple]>,
  dir_id: <ObjectId>
}
```

### POST /document/dir/:dir_id/create

添加文档

INPUT:
```javascript
{
  title: <String>,
  description: <String>,
  content: <String>,
}
```

### PUT /document/file/:file_id

修改文档详情

INPUT
```javascript
{
  title: <String>,
  description: <String>,
  content: <String>,
}
```

### GET /document/file/:file_id

获取文档详情

OUTPUT:
```javascript
{
  _id: <ObjectId>,
  name: <String>,
  description: <String>,
  author: <String>,
  content: <String>,
  date_update: <Date>,
  date_create: <Date>,
  updated_by: <ObjectId>,
  path: <String>,
  mimetype: <String>,
  size: <Number>,
}
```

### PUT /document/move

移动文件和文件夹

INPUT
```javascript
{
  files: [<ObjectId>..],
  dirs: [<ObjectId>..],
  origin_dir: <ObjectId>,
  target_dir: <ObjectId>,
}
```
