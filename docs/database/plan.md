# Tlifang Pro-Team Database Design

## Description

## Basic Type Define

```javascript
TeamPlan: String[Enum:free,pro,ent] // 团队方案：免费版，专业版，企业版
PlanStatus: String[Enum:actived,expired],
AuthStatus: String[Enum:posted,cancelled,reposted,accepted,rejected],
```

## Tables

### Collection plan.company

团队计划（包括购买和试用的信息）

```javascript
{
  _id: ObjectId,                    // company_id
  certificated: {
    plan: TeamPlan,
    date: Date,
  },
  current: {
    _id: ObjectId,                  // 下面list中对应的_id
    plan: TeamPlan,
    type: String[Enum: paid, trial],
  },
  list: [{
    _id: ObjectId,
    plan: TeamPlan,
    type: String[Enum: paid, trial],
    user_id: ObjectId,                // 申请用户
    plan: TeamPlan,                   // 升级方案
    member_count: Number,             // 购买的人数
    status: PlanStatus                // 状态
    date_start: Date,                 // 申请日期
    date_end: Date,                   // 申请日期
  }...]
}
```

### Collection plan.auth

公司升级信息

```javascript
{
  _id: ObjectId,
  company_id: ObjectId,             // 团队
  user_id: ObjectId,                // 申请用户
  plan: TeamPlan,                   // 升级方案
  status: AuthStatus,               // 认证状态
  info: {
    contact: {
      realname: String,
      gender: String[Enum:F,M],
      position: String,
      phone: String,
      address: {
        country: String,
        province: String,
        city: String,
        district: String,
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
      location: address: {
        country: String,
        province: String,
        city: String,
        district: String,
        address: String,
      },
      type: String[Enum:none-profit,workshop,startup],
      scale: Number[Enum:5,10,50,100],
      description: String,
    }
    // 企业信息
    enterprise: {
      location: address: {
        country: String,
        province: String,
        city: String,
        district: String,
        address: String,
      },
      industry: String,               // 行业类型
      certificate_pic: URL,
      scale: Number[Enum:5,10,50,100,500],
      description: String,
    }
  },
  log: [{
    _id: ObjectId,
    status: OrderStatus,
    date_create: Date,
    creator: String[Enum:user,system,cs], // 用户，系统，客服
    operator_id: String,
  }]
  date_apply: Date,                 // 申请日期
}
```
