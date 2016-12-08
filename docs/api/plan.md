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


## order

订单的几种形式：

1. 未购买过，新购，order_type = new
2. 已购买，增加周期，人数方案不变，order_type = renewal
3. 已购买，升级人数或方案（付款成功后生效），order_type = increase
4. 已购买，降级人数或方案（立即生效），order_type = decrease
5. 已过期，等同新购（方案不变，人数不变），order_type = expire


### POST /order

INPUT

```javascript
{
  plan: TeamPlanPaid,      // order_type 为 new increase decrease
  order_type: String,     // new, renewal, increase, decrease, expire
  times: Int,             // order_type 为 new renewal expire
  products: [             // order_type 为 new increase decrease
    {
      product_no: String,
      quantity: Number,
    } ...
  ],
  coupon: ObjectId,       // 满足优惠券条件
}
```

OUTPUT

```javascript
{
  _id: ObjectId,
  ...
}
```

### POST /order/prepare

INPUT

同 POST /order

OUTPUT

```javascript
{
  isValid: Boolean,
  error: String, // isValid为fasle时
  limits: {
    member_count: Int,
  },
  order: {
    _id: ObjectId,
    ...
  }
}
```
