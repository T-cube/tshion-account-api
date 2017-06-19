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
  room: {
    _id: ObjectId,
    manager: ObjectId,
    eqiupment: [ObjectId...],
    status: Enum,
    comments: [{
      user_id: ObjectId,
      type: Enum,
      content: String,
      date_create: Date,
    }...],
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


## room
```javascript
{
  company_id: ObjectId,
  name: String,
  type: [String...], //会议 ，面试 ，会客等等
  max_member: Number,
  equipments: [{
    _id: ObjectId,
    name: String,
    optional: Boolean,
  }...],
  approval: Boolean,
  introduction: String,
  date_create: Date,
  date_update: Date,
}
```
