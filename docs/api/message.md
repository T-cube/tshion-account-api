# API Message

[返回目录](index.md)

获取消息

## API Functions

### GET /message

获取消息列表

```javascript
[{
  _id: <ObjectId>,
  from: <ObjectId>,
  to: <ObjectId>,
  target_type: <String[Enum]>,
  target_id: <ObjectId>,
  verb: <String>,
  is_read: <Boolean>,
  date_create: <Date>,
}...]
```
