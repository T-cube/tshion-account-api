# app-tool 数据库结构文档

## apps collection

```javascript
{
  _id: ObjectId,
  app_name: String, //"note"
  storage: [String], //"note"
  app_info: {
    version: String, //"0.1.0"
    author: String, //"foo"
    introduction: String, //"this is an incredible note app"
    organization: String, // "tlifang.com"
  },
  likes: Number, //2345
  star: Number, // 4.7  average of this app comments stars
  comments: [
    {
      user_id: ObjectId,
      star: Number[Enum=1,2,3,4,5], //5
      content: String, //"wonderful!"
    }...,
  ]
}
```

## company.app.config collection

```javascript
{
  company_id: ObjectId,
  apps:[
    {
      app_id: ObjectId,      
      enable: Boolean, //true
      options: {
        showDirection: Boolean, //true
        timeout: Number, //3000
      }
    }...,    
  ]
}
```

## app.note collection

```javascript
{
  company_id: ObjectId,
  company_activities: [
    {
      user_id: ObjectId,
      create_date: Date, //2017-5-21
      activity: String, //like gea's shared note
    }...,
  ]
  content: [
    {
      user_id: ObjectId,
      notes: [
        {
          note_name: String, //"react"
          note_content: String, //"how to become a genius frontend engineer"
          directory: String, //"work"
          category: String, //"frontend"
          create_date: Date, //2017-5-12
          update_date: Date, //2017-5-20
          tag: String, //"pink"
          share: Boolean, //true
          likes: Number, //16
        }...,
      ]
    }...,
  ]  
}
```
