# API接口文档

## 基础接口

### `GET /contacts`

返回用户通讯录

```javascript
[
  {
    "user_id": ObjectId(),
    "name": ObjectId(), //nickname
    "avatar": String
  }
  //...
]
```

### `GET /groups`

获取用户组信息

```javascript
[
  {
    "_id": ObjectId(),
    "id": /\w+/,            // group id (optional)
    "name": String,         // group name
    "owner": ObjectId()     // owner users._id
    "description": String,  // description text
    "avatar": String,       // group avatar
    "users": [              // array of users
      {
        "user_id": ObjectId(), // reference to users._id
        "nickname": String,    // group nickname of user
        "description": String  // group description of user
      }
      //...
    ]
  }
  //...
]
```

### `GET /talks`

```javascript
[
  {
    "_id": ObjectId(),
    "task_id": String,
    "up_time": Date
  }
]
```

## 好友关系添加接口

### `GET /relation/requests`

获取对自己的请求列表

RESPONSE:
```javascript
[
  {
    "_id": ObjectId(),
    "from": ObjectId(),     // _id the request send from
    "to": ObjectId(),       // _id the user he/she wants to add
    "type": "friend|group",
    "rel_id": ObjectId(),   // request object _id
    "message": "老王，加我好友撒！",
    "add_time": Date,
    "up_time": Date,
    "is_read": Boolean,
    "accepted": Boolean
  }
  //...
]
```

### `GET /relation/friend/search/:username`

验证用户是否存在

```javascript
{
  "found": true|false,
  "user_id": ObjectId()
}
```

### `POST /relation/friend/request`

请求添加好友

POST:
```javascript
{
  "user_id": ObjectId(),
  "message": "{request message}"
}
```

RESPONSE:
```javascript
{
  "result": true|false,     // 是否成功发出请求
  "reason": "rejected"      // 被拒绝原因
}
```

### `POST /relation/group/invite`

请求加入群组

POST:
```javascript
{
  "group_id": ObjectId(),
  "user_id": ObjectId(),
  "message": "{request message}"
}
```

RESPONSE:
```javascript
{
  "result": true|false,     // 是否成功发出请求
  "reason": "rejected"      // 被拒绝原因
}
```

### `POST /relation/group/request`

请求加入群组

POST:
```javascript
{
  "group_id": ObjectId(),
  "message": "{request message}"
}
```

RESPONSE:
```javascript
{
  "result": true|false,     // 是否成功发出请求
  "reason": "rejected"      // 被拒绝原因
}
```
