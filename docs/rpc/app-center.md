## app-center

### /app/list

QUERY
```javascript
{
  page: <Int>,
  pagesize: <Int>,
  enabled: <Boolean>,
  keyword: <String>,
}
```

### /app/enabled

QUERY
```javascript
{
  appid: <String>,
  enabled: <Boolean>,
}
```

### /slideshow/list

QUERY
```javascript
{
  page: <Int>,
  pagesize: <Int>,
  active: <Boolean>,
}
```

### /slideshow/actived

QUERY
```javascript
{
  slideshow_id: <ObjectId>,
  active: <Boolean>,
}
```

### /slideshow/upload

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
