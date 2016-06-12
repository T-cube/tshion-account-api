# API User

[返回目录](index.md)

项目

## 挂载点

```
/
```

## Table of Contents

* [GET /user/project](#post-user-project)

## API function

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

### PUT /user/options

修改用户选项

INPUT:
```javascript
{
  notice_request: <Boolean>,
  notice_project: <Boolean>,
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

### POST /user/change-pass

修改密码

```javascript
{
  old_password: <String>,
  new_password: <String>,
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
