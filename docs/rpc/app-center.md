## app-center

### /app-center/app/list

QUERY
```javascript
{
  page: <Int>,
  pagesize: <Int>,
  enabled: <Boolean>,
  keyword: <String>,
}
```

### /app-center/app/enabled

QUERY
```javascript
{
  appid: <String>,
  enabled: <Boolean>,
}
```

### /app-center/slideshow/list

QUERY
```javascript
{
  page: <Int>,
  pagesize: <Int>,
  active: <Boolean>,
}
```

### /app-center/slideshow/actived

QUERY
```javascript
{
  slideshow_id: <ObjectId>,
  active: <Boolean>,
}
```

### /app-center/slideshow/delete

QUERY
```javascript
{
  slideshows: [ObjectId...], //ObjectId array
}
```

### /app-center/slideshow/upload

STREAM

DATA
```javascript
{
  name: <String>//report.png,
  type: <String>//image/png,
  size: //9593,
  appid: //com.tlifang.report
}
```

### /app/info/change

data
```javascript
{
  qppid: String,
  type: String, //optional
  total_installed: integer, //optional
  description: String, //optional
  update_info: String, //optional
  name: String, //optional
  slideshow: array, //optional
  author: String, //optional
  star: integer, //optional, gte 0 ,lte 5
}
```

### /app/slideshow/upload

stream

data:
```javascript
{
  appid: String,
  name: String,
}
```

### /app/slideshow/delete

data:
```javascript
{
  appid: String,
  url: String,
}
```
