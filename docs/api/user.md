# API Project

[返回目录](index.md)

项目

## 挂载点

```
/
```

## Table of Contents

* [GET /user/project](#post-project)

## API function

### GET /user/project

获取用户关联项目

QUERY_STRING
```javascript
{
  company: <ObjectId[Optional]>,
  type: <String[Enum:all,mine,achieved]>,
}
```
