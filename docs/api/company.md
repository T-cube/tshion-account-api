# API company/*

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
[
  {
    "_id":"...",
    "name":"...",
    //...
  }
]
```
ERROR

`none`

### GET /company/:company_id

获取公司详情

INPUT
`none`

OUTPUT

`none`

ERROR

`none`

### POST /company

增加公司

INPUT
```javascript
{
  "_id":"...",
  "name":"...",
  //...
}
```
OUTPUT

`none`

ERROR

`none`

### PATCH /company/:company_id

修改公司信息

INPUT
```javascript
{
  "email":"...",
  //...
}
```
OUTPUT

`none`

ERROR

`none`

### DELETE /company/:company_id

删除公司信息

INPUT

`none`

OUTPUT

`none`

ERROR

`none`

### GET /company/:company_id/member

获取公司成员列表

INPUT

`none`

OUTPUT

`none`

ERROR

`none`

### GET /company/:company_id/member/:member_id

获取公司成员详情

INPUT

`none`

OUTPUT

`none`

ERROR

`none`

### POST /company/:company_id/member/:member_id

添加修改公司成员

INPUT

`none`

OUTPUT

`none`

ERROR

`none`


### DELETE /company/:company_id/member/:member_id

删除公司成员

INPUT

`none`

OUTPUT

`none`

ERROR

`none`

### POST /company/:company_id/structure/:node_id

添加部门

INPUT
```javascript
{
  "node": {
    "name": String,
    "description": String
  }
  "parent_id": :ObjectId
}
```

OUTPUT
```javascript
{
  "_id": :ObjectId,
  ...
}
```

ERROR

`none`

### PUT /company/:company_id/structure/:node_id

修改部门

INPUT
```javascript
{
  "name": String,
  "description": String
}
```

OUTPUT
```javascript
:nodeObject
```

ERROR

`none`

### DELETE /company/:company_id/structure/:node_id

删除部门

INPUT
`none`

OUTPUT
`none`

ERROR

`none`

### POST /company/:company_id/structure/:node_id/member

添加部门成员

INPUT
```javascript
{
  "_id": ObjectId,
  "title": String // job title
}
```

OUTPUT

`object`

ERROR

`none`

### PUT /company/:company_id/structure/:node_id/member/:member_id

更新部门成员

INPUT
```javascript
{
  "_id": ObjectId
  "is_manager": [true|false],
  "title": String // job title
}
```

OUTPUT

`none`

ERROR

`none`

### DELETE /company/:company_id/structure/:node_id/member/:member_id

移除部门成员

INPUT
`none`

OUTPUT

`none`

ERROR

`none`
