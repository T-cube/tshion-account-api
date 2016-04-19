# API Announcement

[返回目录](index.md)

公司公告

## 挂载点

```
/company/:company_id
```

## Table of Contents

[POST /announcement](#post-announcement)

## Function List

### POST /announcement

添加公告

INPUT
```javascript
{
  title: <String>,                // 标题
  content: <String>,              // 内容
  from: {
    creator: <ObjectId>,          // 创建人
    department: <ObjectId>,       // 发起部门
  },
  to: {
    member: [<ObjectId>...],      // 接收成员
    department: [<ObjectId>...],  // 接收部门
  },
  date_publish: <Date>,           // 发布日期
}
```

### GET /announcement

获取全部公告

OUTPUT
```javascript
[{
  _id: <ObjectId>,
  company_id: <ObjectId>,
  title: <String>,                // 标题
  //content: <String>,              // 内容
  from: {
    creator: <ObjectId>,          // 创建人
    department: <ObjectId>,       // 发起部门
  },
  to: {
    member: [<ObjectId>...],      // 接收成员
    department: [<ObjectId>...],  // 接收部门
  },
  date_publish: <Date>,           // 发布日期
}...]
```

### GET /announcement/:announcement_id

获取公告详情

OUTPUT
```javascript
{
  _id: <ObjectId>,
  company_id: <ObjectId>,
  title: <String>,                // 标题
  content: <String>,              // 内容
  from: {
    creator: <ObjectId>,          // 创建人
    department: <ObjectId>,       // 发起部门
  },
  to: {
    member: [<ObjectId>...],      // 接收成员
    department: [<ObjectId>...],  // 接收部门
  },
  date_publish: <Date>,           // 发布日期
}
```

### DELETE /announcement/:announcement_id

删除公告
