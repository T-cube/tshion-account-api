# app.store.<app_id_hash>
app_id_hash = md5(app_id)


## user

```javascript
{
  _id: ObjectId,
  user_id: ObjectId ,
  company_id: ObjectId,
  tags: [
    {
      name: String,
      _id: ObjectId
    }...,
  ],
  notebooks: [
    {
      name: String,
      _id: ObjectId,
    }...,
  ]
},
```


## note

```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  company_id: ObjectId,
  title: String, //"react"
  content: String, //"how to become a genius frontend engineer"
  tags: [ObjectId...],
  notebook: ObjectId,
  comments: [ObjectId...],
  likes: [ObjectId...],
  shared: Boolean, //true
  create_date: Date, //2017-5-12
  update_date: Date, //2017-5-20
}
```

## note.comment

```javascript
{
  _id: ObjectId,
  note_id: ObjectId,
  user_id: ObjectId,
  company_id: ObjectId,
  content: String,
  date_create: DATE
}
```
