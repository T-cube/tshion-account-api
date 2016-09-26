# API Message

[返回目录](index.md)

获取消息

## API Functions

### GET /notification

获取消息列表

```javascript
[{
  _id: <ObjectId>,
  from: <ObjectId>,
  to: <ObjectId>,
  action: <String>,
  target_type: <String[Enum]>,
  [target]: <ObjectId>, // 各种相关对象
  is_read: <Boolean>,
  date_create: <Date>,
}...]
```

### GET /notification/unread-count

获取未读消息数目

```javascript
{
  count: <Int>,
}
```

### POST /notification/:notification_id/read

设置单条消息已读

### POST /notification/read

设置多条消息已读

INPUT:
```javascript
{
  ids: [<ObjectId>...],
}
```

### POST /notification/read/all

设置全部消息已读
