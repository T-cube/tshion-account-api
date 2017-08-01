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

### /slideshwo/upload

STREAM

DATA
```javascript
{
  fieldname: <String>//document,
  originalname: <String>//report.png,
  encoding: <String>//7bit,
  mimetype: <String>//image/png,
  ext: <String>//.png,
  uuidName: <String>//131ff2df-2091-4b10-8513-79cf8035ecb1.png,
  size: //9593,
  appid: //com.tlifang.report
}
```
