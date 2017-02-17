
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

OUTPUT

```javascript
{
  _id: ObjectId,
  plan: String,
  status: String,
  nearest_data: {
    contact: {
      realname: String,
      gender: String[Enum:F,M],
      phone: String,
      // 实名信息，仅在专业版认证时需要
      address: {
        province: String,
        city: String,
        district: String,
        postcode: String,
        address: String,
      },
      // 实名信息，仅在专业版认证时需要
      realname_ext: {
        idcard: String, // 身份证编码
        idcard_photo: [ObjectId],
      },
    },
    // 团队信息
    team: {
      team_name: String,
      location: {
        country: String,
        province: String,
        city: String,
        district: String,
        address: String,
      },
      industry: {
        classify: String,
        industry: String,
      },
      scale: String,
      description: String,
    }
    // 企业信息
    enterprise: {
      team_name: String,
      location: {
        province: String,
        city: String,
        district: String,
        postcode: String,
        address: String,
      },
      industry: {
        classify: String,
        industry: String,
      },
      scale: String,
      description: String,
      certificate_type: String, // license, code
      certificate_pic: [ObjectId],
    }
  },
  history_data: [{}], // 历史提交的记录
  date_apply: Date,
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
