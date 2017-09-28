# API short

## 短链接相关

### POST /s

body:
```javascript
{
  url: String, //想要转化成短链接的URL，https://XXXX.XXX.XXX/xxx/xx/x?a=123可以是这种格式
  time: Number, //短链接有效时长，单位秒(s)，可以不传则默认为3600
}
```

OUTPUT:
```javascript
{
  short_url: String
}
```


### GET /s/:hash

跳转到存储的url，失效跳转404
