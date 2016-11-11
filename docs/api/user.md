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
  approval: { editable: <Boolean>, default: <Boolean>, isOn: <Boolean> }
  announcement: { editable: <Boolean>, default: <Boolean>, isOn: <Boolean> }
  company_member_invite: { editable: <Boolean>, default: <Boolean>, isOn: <Boolean> }
  company_member_update: { editable: <Boolean>, default: <Boolean>, isOn: <Boolean> }
  company_member_remove: { editable: <Boolean>, default: <Boolean>, isOn: <Boolean> }
  structure_member: { editable: <Boolean>, default: <Boolean>, isOn: <Boolean> }
  project_discussion: { editable: <Boolean>, default: <Boolean>, isOn: <Boolean> }
  project_member: { editable: <Boolean>, default: <Boolean>, isOn: <Boolean> }
  project_transfer: { editable: <Boolean>, default: <Boolean>, isOn: <Boolean> }
  project_quit: { editable: <Boolean>, default: <Boolean>, isOn: <Boolean> }
  task_assigned: { editable: <Boolean>, default: <Boolean>, isOn: <Boolean> }
  task_dailyreport: { editable: <Boolean>, default: <Boolean>, isOn: <Boolean> }
  task_update: { editable: <Boolean>, default: <Boolean>, isOn: <Boolean> }
  request: { editable: <Boolean>, default: <Boolean>, isOn: <Boolean> }
  schedule_remind: { editable: <Boolean>, default: <Boolean>, isOn: <Boolean> }
  attendance: { editable: <Boolean>, default: <Boolean>, isOn: <Boolean> }
}
```

### PUT /user/options/notification

修改用户选项

INPUT:
```javascript
{
  type: <String[Enum]>, // models/notification-setting
  method: <String[Enum: wechat, web, email]>,
  isOn: <Boolean>,
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
