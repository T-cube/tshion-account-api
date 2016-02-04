# 数据库结构

## users

用户

```javascript
{
  "_id": ObjectId(),
  "username": /\w+/,       // user login name (mobile phone number)
  "name": String,          // nickname
  "password": md5('password')  // md5 hash of user password
  "avatar": String,
  "contacts" [             // friends list
    {
      "_id": ObjectId, // reference to friend users._id
      "nickname": String   // friend nickname by user
    }
  ]
  "groups": [
    ObjectId(),
    //...
  ],
  "peers": [
    ObjectId(),
    //...
  ]
}
```

## groups

用户群

```javascript
{
  "_id": ObjectId(),
  "id": /\w+/,            // group id (optional)
  "name": String,         // group name
  "owner": ObjectId()     // owner users._id
  "description": String,  // description text
  "avatar": String,       // group avatar
  "users": [              // array of users
    {
      "_id": ObjectId(), // reference to users._id
      "nickname": String,    // group nickname of user
      "description": String  // group description of user
    }
    //...
  ]
}
```

## peers

二人、多人讨论组

```javascript
{
  "_id": ObjectId(),
  "id": /\w+/,            // peer id (optional)
  "name": String,         // peer name
  "users": [              // array of users
    ObjectId(),           // list of users._id
    //...
  ]
}
```

## talks

会话（基于任务的会话）

```javascript
{
  "_id": ObjectId(),
  "task_id": ObjectId(),  // referenced to tasks._id
  "type": "group|peer",   // peer name
  "rel_id": ObjectId()    // group or peer _id by `type`
}
```

## friend_requests

好友请求

```javascript
{
  "_id": ObjectId(),
  "from": {               // _id the request send from
    "user_id": ObjectId(),
    "nickname": "",
  },
  "to": ObjectId(),       // _id the user he/she wants to add
  "type": "friend|group",
  "rel_id": ObjectId(),   // request object _id
  "message": "老王，加我好友撒！",
  "add_time": Date,
  "up_time": Date,
  "is_read": Boolean,
  "accepted": Boolean
}
```
