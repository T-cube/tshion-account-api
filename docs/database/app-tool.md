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
  author_id: ObjectId,
  description: String, //"this is an incredible note app"
  update_info: String, //"fixed some bugs"
  star: Number, // 4.7  average of this app comments stars
  metadata: {
    storage: [String, ...], //"note"
    dependency: String,
  },
  published: Boolean,
  date_publish: Date,
  date_update: Date,
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
  app_id: ObjectId,
  app_version: String, //"0.1.0"
  user_id: ObjectId,
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
      app_id: ObjectId,
      enabled: Boolean, //true
    }...,
  ]
}
```

```javascript
db.company.app.update({
  company_id: '123',
  'apps.app_id': 'demp_app',
}, {
  $set: {
    'apps.$.enabled': false,
  }
});
```

## company.app.config

```javascript
{
  _id: ObjectId,
  company_id: ObjectId,
  app_id: ObjectId,
  options: {
    showDirection: Boolean, //true
    timeout: Number, //3000
    requirement: String,        
  }
}
```

# app.store.<app_id_hash>.<app_collection_name>

app_id_hash = md5(app_id)
