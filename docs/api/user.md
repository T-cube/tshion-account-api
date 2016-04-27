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
  address: <String>,
  sex: <String[Enum:F,M]>,
  local: <String>,
  address: {
    country: <String>,
    province: <String>,
    city: <String>,
    address: <String>,
  },
  date_join: <Date>,
}
```

### PUT /user/info

INPUT:
```javascript
{
  name: <String>,
  description: <String>,
  mobile: <String>,
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

### PUT /user/avatar

INPUT:
`Content-Type: x-www-form-urlencoded`
```javascript
{
  avatar: <File>,
  crop_x: <Int>,
  crop_y: <Int>,
  crop_width: <Int>,
  crop_height: <Int>,
}
```

### GET /user/project

获取用户关联项目列表

QUERY_STRING
```javascript
{
  company: <ObjectId[Optional]>,
  type: <String[Enum:all,mine,achieved]>,
  search: <String>, // project name
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
