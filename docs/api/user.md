# API User

[返回目录](index.md)

项目

## 挂载点

```
/
```

## 基本信息获取、修改

### GET /user/info

OUTPUT:
```javascript
{
  _id: <ObjectId>,
  email: <String>,
  email_verified: <Boolean>,
  mobile: <String>,
  mobile_verified: <Boolean>,
  name: <String>,
  description: <String>,
  avatar: <URL>,
  birthdate: <Date>,
  sex: <String[Enum:F,M]>,
  locale: <String>,
  address: {
    country: <String>,
    province: <String>,
    city: <String>,
    district: <String>,
    address: <String>,
  },
  date_join: <Date>,
  options: {
    notice_request: <Boolean>,
    notice_project: <Boolean>,
  },
  locale: <String>,
  timezone: <String>,
  current_company: <ObjectId>,
  preference: {
    'explore.sort_by': String,
    'explore.view_type': String,
    'weather.areaid': String,
    'panel.announcement': Boolean,
    'panel.schedule': Boolean,
    'panel.task': Boolean,
    ...
  }
}
```

### PUT /user/info

INPUT:
```javascript
{
  name: <String>,
  description: <String>,
  birthdate: <Date>,
  sex: <String[Enum:F,M]>,
  address: {
    country: <String>,
    province: <String>,
    city: <String>,
    district: <String>,
    address: <String>,
  },
}
```

### PUT /user/settings

修改用户选项

INPUT:
```javascript
{
  locale: <String>,
  timezone: <String>,
  current_company: <ObjectId>,
}
```

### GET /user/options/notification

OUTPUT:
```javascript
{
  approval: { [web|wechat|email]: <Boolean> ... },              // 审批
  announcement: { [web|wechat|email]: <Boolean> ... },          // 公告
  company_member_invite: { [web|wechat|email]: <Boolean> ... }, // 团队邀请
  company_member_update: { [web|wechat|email]: <Boolean> ... }, // 团队成员更新
  company_member_remove: { [web|wechat|email]: <Boolean> ... }, // 团队成员移除
  structure_member: { [web|wechat|email]: <Boolean> ... },      // 团队职位更新
  project_discussion: { [web|wechat|email]: <Boolean> ... },    // 项目讨论
  project_member: { [web|wechat|email]: <Boolean> ... },        // 项目成员更新
  project_transfer: { [web|wechat|email]: <Boolean> ... },      // 项目转让
  project_quit: { [web|wechat|email]: <Boolean> ... },          // 项目成员退出
  task_assigned: { [web|wechat|email]: <Boolean> ... },         // 新任务提醒
  task_dailyreport: { [web|wechat|email]: <Boolean> ... },      // 任务日报
  task_update: { [web|wechat|email]: <Boolean> ... },           // 任务更新
  request: { [web|wechat|email]: <Boolean> ... },               // 团队邀请
  schedule_remind: { [web|wechat|email]: <Boolean> ... },       // 日程提醒
  attendance: { [web|wechat|email]: <Boolean> ... },            // 考勤提醒
}
```

### PUT /user/options/notification

修改用户选项

INPUT:
```javascript
{
  type: <String[Enum]>, // models/notification-setting
  method: <String[Enum: wechat, web, email]>,
  on: <Boolean>,
}
```

### PUT /user/avatar

设置用户头像

INPUT:
```javascript
{
  avatar: <URL>,
}
```
### PUT /user/avatar/upload

上传用户头像

INPUT:
`Content-Type: multipart/form-data`
```javascript
{
  avatar: <File>,
  crop_x: <Int>,       // optional
  crop_y: <Int>,       // optional
  crop_width: <Int>,   // optional
  crop_height: <Int>,  // optional
}
```

### GET /user/project

获取用户关联项目列表

QUERY_STRING
```javascript
{
  company: <ObjectId[Optional]>,
  type: <String[Enum:all,mine,achieved]>,
  search: <String[Optional]>, // project name
}
```

OUTPUT:
```javascript
[{
  _id: <ObjectId>,
  name: <String>,
  description: <String>,
  logo: <URL>,
}...]
```

## 账号安全操作相关

### POST /user/change-pass

修改密码

INPUT:
```javascript
{
  old_password: <String>,
  new_password: <String>,
}
```

### POST /user/account/verify

校验当前登录账号全称（绑定新邮箱、手机号码前）

INPUT:
```javascript
{
  type: <String[Enum:email,mobile]>,
  <type>: <String>,
}
```

### POST /user/account/send-code

向需要绑定的邮箱、手机号码发送验证码

INPUT:
```javascript
{
  type: <String[Enum:email,mobile]>,
  old_<type>: <String[optional]>,
  new_<type>: <String>,
}
```

### POST /user/account/bind-account

根据验证码修改账户绑定邮箱、手机号码

INPUT:
```javascript
{
  type: <String[Enum:email,mobile]>,  // 账号类型             
  code: <String>,                     // 验证码
  old_<type>: <String[optional]>,     // 旧账号，当原来未绑定账号时不需要指定此项
  new_<type>: <String>,               // 新账号
}
```

### POST /user/preference

修改用户的偏好设置

INPUT:
```javascript
{
  'explore.sort_by': String,
  'explore.view_type': String,
  'weather.areaid': String,
  'panel.announcement': Boolean,
  'panel.schedule': Boolean,
  'panel.task': Boolean,
  ...
}
```

### PUT /user/preference/reset

恢复默认的设置

INPUT:
```javascript
{
  type: String, // panel 恢复仪表盘默认
}
```
