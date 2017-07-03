# app-tool 数据库结构文档

## app

```javascript
{
  _id: ObjectId,
  appid: String, // com.tlifang.app.notebook
  name: String, //"note"
  name_en: String,
  version: String, //"0.1.0"
  icons: {
    '16': String,
    '64': String,
    '128': String,
  },
  slideshow: [String, ...],
  author: String, //"foo"
  url: String,
  description: String, //"this is an incredible note app"
  update_info: String, //"fixed some bugs"
  star: Number, // 4.7  average of this app comments stars
  permissions: [String...],
  dependencies: [String...],
  storage: {
    "mongo": [String...]
  },
  date_create: Date,
}
```

## app.version

```javascript
{
  appid: String, // com.tlifang.app.notebook
  current: ObjectId,
  versions: [ObjectId...],
}
```

## app.author

```javascript
{
  _id: ObjectId,
  name: String,
  website: String,
  company: {
    fullname: String,
    address: {
      province: String,
      city: String,
      district: String,
      address: String,
    },
    postcode: String,
    phone: String,
    contact: String,
  }
}
```

## app.comment

```javascript
{
  _id: ObjectId,
  appid: ObjectId,
  app_version: String, //"0.1.0"
  user_id: ObjectId,
  user_name: String,
  user_avatar: String,
  star: Number[Enum=1,2,3,4,5], //5
  content: String, //"wonderful!"
  likes: [ObjectId...], //users
  date_create: Date,
}
```


## company.app

```javascript
{
  company_id: ObjectId,
  apps:[
    {
      appid: ObjectId,
      enabled: Boolean, //true
    }...,
  ]
}
```


## company.app.config

```javascript
{
  _id: ObjectId,
  company_id: ObjectId,
  appid: ObjectId,
  options: {
    showDirection: Boolean, //true
    timeout: Number, //3000
    requirement: String,        
  }
}
```

# app.store.<app_id_hash>.<app_collection_name>

app_id_hash = md5(app_id)
