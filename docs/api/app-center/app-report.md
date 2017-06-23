# APP report API 文档

## 挂载点 /company/:company_id/app/com.tlifang.report

### GET /overview

获得工作汇报使用情况及日周月报汇报情况

### GET /report

查询汇报列表

query:
```javascript
{
  page: Number,
  pagesize: Number,
  type: String, // inbox, outbox
  report_type: ENUM, //day, week, month
  status: String, // 'draft', 'applied', 'agreed', 'rejected' this key is optional
  start_date: Date, // optional
  end_date: Date, // optional
  reporter: ObjectId, //optional
}
```

OUTPUT:
```javascript
[{
  _id: ObjectId,
  user_id: ObjectId,
  type: String, // 'day', 'week', 'month'
  date_report: Date,
  status: String, // 'draft', 'applied', 'agreed', 'rejected'
  report_target: ObjectId
}...]
```

### GET /report/:report_id

汇报详情

OUTPUT:
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  company_id: ObjectId,
  date_report: Date,
  report_target: ObjectId,
  copy_to: [ObjectId...],
  content: String,
  type: String, //day, week, month
  status: String, //draft, applied, agreed, rejected
  attachments: [{
    _id: ObjectId,
    name: String,
    url: String,
  }...],
  comments: [{
    _id: ObjectId,
    user_id: ObjectId,
    action: String, // comment, agree, reject
    new_status: String, //draft, applied, agreed, rejected
    content: String,
    date_create: Date
  }...],  
  date_create: Date,
}
```

### POST /upload

上传附件

OUTPUT:
```javascript
{
  url: String
}
```

### POST /report

上传汇报

body:
```javascript
{
  date_report: Date,
  report_target: ObjectId,
  copy_to: [ObjectId...],
  content: String,
  type: String, //'day', 'week', 'month'
  status: String, //'draft', 'applied'
  attachments: [{
    _id: ObjectId,
    name: String,
    url: String,
  }...],
}
```

### PUT /report/:report_id

修改汇报

body:
```javascript
{
  date_report: Date, //optional
  report_target: ObjectId, //optional
  copy_to: [ObjectId...], //optional
  content: String, //optional
  type: String, //'day', 'week', 'month'  optional
  status: String, //'draft', 'applied' optional
  attachments: [{
    _id: ObjectId,
    name: String,
    url: String,
  }...], //optional
}
```

### POST /report/:report_id/mark

批阅汇报

body:
```javascript
{
  status: String, // agreed, rejected
  content: String
}
```

### POST /report/:report_id/comment

评论汇报

body:
```javascript
{
  content: String,
}
```
