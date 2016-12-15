
## auth

认证

### /plan/auth/list

QUERY

```javascript
{
  page: Int,
  pagesize: Int,
  status: String,  // posted cancelled reposted accepted rejected 多个使用“,”分隔
  plan: String, // ent || pro
}
```

### /plan/auth/detail

QUERY

```javascript
{
  auth_id: ObjectId,
}
```

### /plan/auth/audit

QUERY

```javascript
{
  auth_id: ObjectId,
  status: String,  // accepted rejected
  comment: String,
  operator_id,: String
}
```
