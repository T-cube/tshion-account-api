#API invite

## 邀请

### POST /

body:
```javascript
{
  type: String, //account , company, this field if required.
  company_id: ObjectId, // type == company ? required : optional
  user_id: ObjectId, //optional
  ...//other parameters , all parameters will add to created url's query
}
```

OUTPUT:
```javascript
{
  url: String, // host/api/invite/:type?type=xx&company_id=xxx&other=xxx
}
```
