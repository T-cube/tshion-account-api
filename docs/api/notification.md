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
  [target]: <ObjectId>,
  is_read: <Boolean>,
  date_create: <Date>,
}...]
```
