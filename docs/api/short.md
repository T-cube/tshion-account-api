# API short

## 短链接相关

### POST /s

body:
```javascript
{
  url: String, //想要转化成短链接的URL，https://XXXX.XXX.XXX/xxx/xx/x?a=123可以是这种格式
  time: Number, //短链接有效时长，单位秒(s)，可以不传则默认为3600
  user_id: ObjectId, //生成短链接人的id，可以不传，不传不存，
  company_id: ObjectId, //生成短链接人的公司的id，user_id ？（可以传可以不传） ： （传了也没用）  
}
```
