
## plan-company

各版本的使用情况

### /plan/company/list

QUERY
```javascript
{
  page: Int,
  pagesize: Int,
  plan: String, // ent | pro
  type: String, // trial paid
  status: String, // expired actived
}
```

### /plan/company/detail

QUERY
```javascript
{
  usage_id: ObjectId,
}
```
