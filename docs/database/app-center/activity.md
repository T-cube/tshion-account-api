# app.store.activity 命名空间

## item
```javascript
{
  name: String,
  type: String,
  company_id: ObjectId,
  time_start: Date,
  time_end: Date,
  departments: [ObjectId...],
  content: String,
  attachments: [ObjectId...],
  sign_in_require: Boolean,
  loop: Boolean,
  is_public: Boolean,
  accept_require: Boolean,
  is_member_certified: Boolean,
  creator: ObjectId,
  assistants: [ObjectId...],
  members: [ObjectId...],
  accept_members: [ObjectId...],
  sign_in_members: [ObjectId...],
  followers: [ObjectId...],
  status: Enum, //created, cancelled, approving
  room: {
    _id: ObjectId,
    eqiupment: [ObjectId...],
    approval_id: ObjectId, //optional if room dont need approval
  },
  comments: [{
    _id: ObjectId,
    user_id: ObjectId,
    content: String,
    date_create: Date,
  }...],
  date_create: Date,
  date_update: Date,
}
```

## approval
```javascript
{
  company_id: objectId,
  room_id: objectId,
  creator: objectId,
  manager: objectId,
  status: Enum, //agreed, pending , rejected;
  comments: [{
    _id: objectId,
    user_id: objectId,
    content: String,
    date_create: Date,
  }...]
}
```


## room
```javascript
{
  company_id: ObjectId,
  manager: ObjectId,
  name: String,
  type: [String...], //会议 ，面试 ，会客等等
  max_member: Number,
  equipments: [{
    _id: ObjectId,
    name: String,
    optional: Boolean,
  }...],
  approval_require: Boolean,
  introduction: String,
  date_create: Date,
  date_update: Date,
}
```
