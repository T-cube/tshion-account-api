# API Company

[返回目录](index.md)

公司管理(REST)

## Table of Contents

### company

* [GET /company](#get-company)
* [GET /company/:company_id](#get-company-company_id)
* [POST /company](#post-company)
* [PUT /company/:company_id](#put-company-company_id)
* [DELETE /company/:company_id](#delete-company-company_id)

### member

* [GET /company/:company_id/member](#get-company-company_id-member)
* [GET /company/:company_id/member/:member_id](#get-company-company_id-member-member_id)
* [DELETE /company/:company_id/member/:member_id](#delete-company-company_id-member-member_id)

### structure

#### structure node

* [POST /company/:company_id/structure/:node_id](#post-company-company_id-structure-node_id)
* [PUT /company/:company_id/structure/:node_id](#put-company-company_id-structure-node_id)
* [DELETE /company/:company_id/structure/:node_id](#delete-company-company_id-structure-node_id)

#### structure position

* [POST /company/:company_id/structure/:node_id/position](#post-company-company_id-structure-node_id-position)
* [PUT /company/:company_id/structure/:node_id/position](#put-company-company_id-structure-node_id-position)
* [DELETE /company/:company_id/structure/:node_id/position](#delete-company-company_id-structure-node_id-position)

#### structure member

* [POST /company/:company_id/structure/:node_id/member](#post-company-company_id-structure-node_id-member)
* [PUT /company/:company_id/structure/:node_id/member/:member_id](#put-company-company_id-structure-node_id-member-member_id)
* [DELETE /company/:company_id/structure/:node_id/member/:member_id](#delete-company-company_id-structure-node_id-member-member_id)

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

### GET /company/:company_id/member/:member_id

获取公司成员详情

### POST /company/:company_id/member/:member_id

添加修改公司成员

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
