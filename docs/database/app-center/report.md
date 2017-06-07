## report

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
  attachment: [String...],
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
