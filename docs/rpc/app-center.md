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
