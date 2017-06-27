# APP activity API 文档

## 挂载点 /company/:company_id/app/com.tlifang.activity

### GET /overview

获取我的和所有的活动近期概览（最多两条，查看更多使用 GET /activity）
```javascript
{
  mine: {
    past: [<activity:> {
      name: String,
      type: String,
      time_start: Date,
      time_end: Date,
      departments: [objectId],
      status: String,
      accept_require: Boolean,
      total: Number,
      accept_members: [ObjectId...],
      content: String,
      isMember: Boolean, //我是否参加
      room: {
        _id: objectId, //room_id
        equipments: [objectId...], //equipment_id
      }
    }...],
    now: [<activity>...],
    future: [<activity>...]
  },
  all: {
    past: [<activity>...],
    now: [<activity>...],
    future: [<activity>...]
  }
}
```

### POST /activity

request_body:
```javascript
{
  name: String,
  type: String,
  time_start: Date,
  time_end: Date,
  departments: [objectId...],
  content: String,
  attachments: [{
    _id: objectId,
    name: String,
    url: String
  }...], //optional
  sign_in_require: Boolean,
  loop: Boolean,
  is_public: Boolean,
  accept_require: Boolean,
  certified_member: Boolean,
  creator: objectId,
  assistants: [objectId...],
  members: [objectId...],
  followers: [objectId...],
  room: {
    _id: objectId,//room_id
    equipments: [objectId...]//optional
  },
}
```

### GET /activity

查询活动

query:
```javascript
{
  date_start: Date, //optional
  date_end: Date, //optional
  target: String, // mine, all
  last_id: objectId
}
```

### GET /activity/:activity_id

### POST /activity/:activity_id/sign-in

签到

### POST /activity/:activity_id/sign-up

报名

### POST /activity/:activity_id/comment

评论活动

query:
```javascript
{
  content: String,
}
```

### GET /approval

审批列表

query:
```javascript
{
  page: Number, //最小为1 页数
  pagesize: Number, //最小为1 每页数量
}
```

### GET /approval/:approval_id

审批详情

### POST /approval/:approval_id/comment

评论审批

request_body:
```javascript
{
  content: String,
}
```

### PUT /approval/:approval_id/status

同意/拒绝审批

request_body:
```javascript
{
  status: String, // agreed, rejected
}
```

### delete /activity/:activity_id/cancel

取消活动

### post /room

创建场所

request_body:
```javascript
{
  name: String,
  type: String,
  max_member: Number, // min: 1
  equipments: [{
    name: String,
    optional: Boolean,
  }...],
  order_require: Boolean,
  approval_require: Boolean,
  description: String,
}
```

### GET /room

获取场所列表

### GET /room/:room_id

获取场所详情

### PUT /room/:room_id

管理员修改场所(除了设施)

### PUT /room/:room_id/equipment/:equipment_id

管理员修改设施

request_body:
```javascript
{
  name: String,
  optional: Boolean,
}
```

### POST /room/:room_id/equipment

管理员添加设备

request_body:
```javascript
{
  name: String,
  optional: Boolean,
}
```

### DELETE /room/:room_id/euqipment/:equipment_id

管理员删除设备
