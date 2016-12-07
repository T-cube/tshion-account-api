# auth

## Basic Type Define

```javascript
TeamPlan: String[Enum:free,pro,ent] // 团队方案：免费版，专业版，企业版
TeamPlanPaid: String[Enum:pro,ent] // 专业版，企业版
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
  name: String,
  type: TeamPlan,
  description: String,
  store: Int,
  member: Int,
  products: [
    _id: ObjectId
    title: String,
    plan: String,
    ...
  ],
  ext_info: String,
}...]
```

### GET /status

OUTPUT

```javascript
{
  history: [
    {
      _id: ObjectId,
      type: String, // paid trial
      company_id: ObjectId,
      user_id: ObjectId,
      plan: TeamPlanPaid,
      status: PlanStatus,
      date_start: Date,
      date_end: Date,
    }
  ],
  current: {
    _id: ObjectId,
    type: String, // paid trial
    company_id: ObjectId,
    user_id: ObjectId,
    plan: TeamPlanPaid,
    status: PlanStatus,
    date_start: Date,
    date_end: Date,
  },
  viable: {
    trial: [TeamPlanPaid],
    paid: [TeamPlanPaid],
  },
  authed: [TeamPlanPaid],
}
```

### POST /trial

试用

INPUT

```javascript
{
  plan: [TeamPlanPaid],
}
```


## auth

### GET /auth/status

获取当前的认证状态

OUTPUT

```javascript
{
  [TeamPlanPaid]: {
    _id: ObjectId,
    plan: TeamPlanPaid,
    company_id: ObjectId,
    user_id: ObjectId,
    date_apply: Date,
    status: AuthStatus,
  }
  ...
}
```

### GET /auth/history

QUERY

```javascript
{
  page: Int,
  pagesize: Int,
}
```

OUTPUT

```javascript
{
  list: [{
    _id: ObjectId,
    plan: TeamPlanPaid,
    company_id: ObjectId,
    user_id: ObjectId,
    date_apply: Date,
    status: AuthStatus,
  }],
  page: Int,
  pagesize: Int,
  totalRows: Int,
}
```


### GET /auth/realname

OUTPUT

```javascript
{
  realname: String,
  position: String,
  phone: String,
  address: String,
  realname_ext: {

  }
}
```

### POST /auth/(ent|pro)

提交认证

POST
```javascript
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

### PUT /auth/(ent|pro)

更新认证

POST // 同 post


### PUT /auth/status

取消认证

INPUT

```javascript
{
  status: String, // cancelled
}
```


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
