# API Request

[返回目录](index.md)

关系申请

## 挂载点

```
/user
```

## Table of Contents

...

## API function

### GET /request

收到的请求

QUERY_STRING:
```javascript
{
  status: <String[Enum=pending][optional]>, // 状态过滤
  before: <Date>, // 分页
}
```

OUTPUT:
```javascript
[{
  _id: <ObjectId>,
  from: {                   // 申请人
    _id: <ObjectId>,
    name: <String>,
    avatar: <URL>,
  },
  to: {                     // 被申请人
    _id: <ObjectId>,
    name: <String>,
    avatar: <URL>,
  },
  to: <ObjectId>,           // 被申请人
  type: <String[Enum]>,     // 申请类型
  object: {                 // 申请对象
    _id: <ObjectId>,
    name: <String>,
  },
  status: <String[Enum]>,   // 申请状态
  date_create: <Date>,      // 创建日期
}...]
```

### POST /request/:request_id/accept

INPUT:
```javascript
{
  reason: <String>,
}
```

### POST /request/:request_id/reject

INPUT:
```javascript
{
  reason: <String>,
}
```
