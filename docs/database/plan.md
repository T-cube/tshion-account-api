# Tlifang Pro-Team Database Design

## Description

## Basic Type Define

```javascript
TeamPlan: String[Enum:free,pro,ent] // 团队方案：免费版，专业版，企业版
PlanStatus: String[Enum:actived,expired],
AuthStatus: String[Enum:posted,cancelled,reposted,accepted,rejected],
```

## Tables

### Table `plan.trial`

团队试用信息

```javascript
{
  _id: ObjectId,
  company_id: ObjectId,             // 团队
  user_id: ObjectId,                // 申请用户
  plan: TeamPlan,                   // 升级方案
  status: PlanStatus                // 状态
  date_start: Date,                 // 申请日期
  date_end: Date,                   // 申请日期
}
```

### Table `plan.paid`

付费团队信息

```javascript
{
  _id: ObjectId,
  company_id: ObjectId,             // 团队
  user_id: ObjectId,                // 申请用户
  plan: TeamPlan,                   // 升级方案
  status: PlanStatus                // 状态
  date_start: Date,                 // 申请日期
  date_end: Date,                   // 申请日期
}
```

### Table `plan.auth`

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
      scale: Number[Enum:5,10,50,100,500],
      description: String,
    }
  },
  log: [{
    status: AuthStatus,
    user_id: ObjectId,
    comment: String,
    date_create: Date,
  }]
  date_apply: Date,                 // 申请日期
}
```
