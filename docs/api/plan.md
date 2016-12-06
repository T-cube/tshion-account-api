# auth

## Basic Type Define

```javascript
TeamPlan: String[Enum:free,pro,ent] // 团队方案：免费版，专业版，企业版
PlanStatus: String[Enum:actived,expired],
AuthStatus: String[Enum:posted,cancelled,reposted,accepted,rejected],
```

## 挂载点

```javascript
/company/:companyId/plan
```


### GET /list

OUTPUT

```javascript
[{
  name: <String>,
  type: <String>, // free pro ent
  description: <String>,
  store: <Int>,
  member: <Int>,
  products: [
    _id: ObjectId
    title: String,
    plan: String,
    ...
  ],
  ext_info: <String>,
}...]
```

### GET /current

OUTPUT

```javascript
{
  _id: ObjectId,
  plan: String,
  status: String,
  ...
}
```

### GET /auth

获取最新的认证状态，比如查询企业认证是否成功：{status: 'accepted', plan: 'ent'}

QUERY

```javascript
{
  status: <Array|String>, // accepted rejected ...
  plan: <String>, // pro ent
}
```

OUTPUT

```javascript
[{
  _id: <ObjectId>,
  plan: <String>,
  company_id: <ObjectId>,
  user_id: <ObjectId>,
  date_apply: <Date>,
  status: <String>,
}]
```

### POST /auth

提交认证

POST
```javascript
plan: TeamPlan,                   // 升级方案
status: AuthStatus,               // 认证状态
info: {
  contact: {
    realname: String,
    gender: String[Enum:F,M],
    position: String,
    phone: String,
    address: {
      province: String,
      city: String,
      district: String,
      postcode: String,
      address: String,
    },
    // 实名信息，仅在专业版认证时需要
    realname: {
      idcard: String,              // 身份证编码
      idcard_photo: URL,           // 身份证照片
    },
  },
  // 团队信息
  team: {
    location: {
      province: String,
      city: String,
    },
    type: String[Enum:none-profit,workshop,startup],
    scale: Number[Enum:5,10,50,100],
    description: String,
  }
  // 企业信息
  enterprise: {
    location: {
      province: String,
      city: String,
    },
    industry: String,               // 行业类型
    certificate_pic: URL,
    scale: Number[Enum:5,10,50,100,500],
    description: String,
  }
},
```

### PUT /auth

更新认证

POST // 同 post


### PUT /auth/cancel

取消认证


### POST /order

INPUT

```javascript
{
  plan: String, // pro, ent
  products: [
    {
      product_no: String,
      quantity: Number,
    } ...
  ]
  coupon: ObjectId,
}
```

OUTPUT

```javascript
{

}
```

### POST /order/prepare
