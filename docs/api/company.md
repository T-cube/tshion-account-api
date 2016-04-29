# API Company

[返回目录](index.md)

公司管理(REST)

## Table of Contents

...

## Function List

### GET /company

获取全部公司

INPUT

`none`

OUTPUT
```javascript
[{
  _id: <ObjectId>,
  name: <String>,
  description:<String>,
  logo: <URL>,
}...]
```

### GET /company/:company_id

获取公司详情

```javascript
{
  _id: <ObjectId[auto]>,
  name: <String>,
  description: <String>,
  logo: <URL>,
  owner: <ObjectId[link=user._id]>,
  members: [{
    _id: <ObjectId[link=user._id]>,
    name: <String>,
    mobile: <String>,
    birthdate: <Date>,
    joindate: <Date>,
    email: <String[email]>,
    address: <String>,
    sex: <String[Enum:M,F]>,
  }...],
  structure: <Structure:> {
    _id: <ObjectId>,
    name: <String>,
    positions: [{
      _id: <ObjectId>,
      title: <String>,
    }...],
    members: [{
      _id: <ObjectId[link=user._id]>,
      position: <ObjectId>,
    }...],
    children: [<Structure>...],
  },
  projects: [<ObjectId>...],
}
```

### POST /company

增加公司

INPUT
```javascript
{
  name: <String>,
  description: <String>,
}
```

### PUT /company/:company_id

修改公司信息

INPUT
```javascript
{
  name: <String>,
  description: <String>,
}
```

### POST /company/:company_id/logo

更新公司logo

INPUT
```javascript
{
  logo: <URL>,
}
```

### POST /company/:company_id/transfer

INPUT
```javascript
{
  user_id: <ObjectId>,
  auth_check_token: <String> // 密码认证token
}
```

### DELETE /company/:company_id

删除公司

INPUT
```javascript
{
  auth_check_token: <String> // 密码认证token
}
```

### GET /company/:company_id/member

获取公司成员列表

### POST /company/:company_id/member/check

检验公司成员

INPUT:
```javascript
{
  email: <String[email]>,
}]
```

OUTPUT:
```javascript
{
  name: <String>,
  email: <String[email]>,
}]
```

ERROR:
| code | error | error_description |
| 400 | `member_exists` | member exists |
| 400 | `bad_request` | email format error |

OUTPUT:
```javascript
[{
  _id: <ObjectId[link=user._id]>,
  name: <String>,
  mobile: <String>,
  birthdate: <Date>,
  joindate: <Date>,
  email: <String[email]>,
  address: <String>,
  sex: <String[Enum:M,F]>,
  type: <String[Enum]>,
  status: <String[Enum]>,
}...]
```

### GET /company/:company_id/member/:member_id

获取公司成员详情

OUTPUT:
```javascript
{
  _id: <ObjectId[link=user._id]>,
  name: <String>,
  mobile: <String>,
  birthdate: <Date>,
  joindate: <Date>,
  email: <String[email]>,
  address: <String>,
  sex: <String[Enum:M,F]>,
  type: <String[Enum]>,
  status: <String[Enum]>,
}
```

### POST /company/:company_id/member

添加公司成员

INPUT:
```javascript
{
  name: <String>,
  mobile: <String>,
  birthdate: <Date>,
  joindate: <Date>,
  email: <String[email]>,
  address: <String>,
  sex: <String[Enum:M,F]>,
  type: <String[Enum]>,    //需管理员权限
}
```

### PUT /company/:company_id/member/:member_id

修改公司成员

INPUT:
```javascript
{
  name: <String>,
  mobile: <String>,
  birthdate: <Date>,
  joindate: <Date>,
  email: <String[email]>,
  address: <String>,
  sex: <String[Enum:M,F]>,
  type: <String[Enum]>,    //需管理员权限
}
```

### DELETE /company/:company_id/member/:member_id

删除公司成员

### POST /company/:company_id/structure/:node_id

添加部门

INPUT
```javascript
{
  name: String,
  description: String,
}
```

OUTPUT
```javascript
{
  _id: <ObjectId>,
}
```

### PUT /company/:company_id/structure/:node_id

修改部门

INPUT
```javascript
{
  name: String,
  description: String
}
```

### DELETE /company/:company_id/structure/:node_id

删除部门

### POST /company/:company_id/structure/:node_id/member

添加部门成员

INPUT
```javascript
{
  _id: ObjectId,
  title: String // job title
}
```

### PUT /company/:company_id/structure/:node_id/member/:member_id

更新部门成员

INPUT
```javascript
{
  _id: <ObjectId>
  is_manager: <Boolean>,
  title: <String> // job title
}
```

### DELETE /company/:company_id/structure/:node_id/member/:member_id

移除部门成员
