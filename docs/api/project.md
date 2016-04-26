# API Project

[返回目录](index.md)

项目

## 挂载点

```
/company/:company_id
```

## Table of Contents

* [POST /project](#post-project)
* [GET /project](#get-company-company_id-project)
* [GET /project/:project_id](#get-company-company_id-project-project_id)
* [DELETE /project/:project_id](#delete-company-company_id-project-project_id)

## API function

### POST /project

INPUT
```javascript
{
  "name": "",
  "description": ""
}
```

### PUT /project/:project_id

INPUT
```javascript
{
  "name": "",
  "description": ""
}
```

### GET /project

获取全部任务

OUTPUT
```javascript
[
  {
    "_id":"...",
    "name":"...",
    //...
  } // 请参照项目详情
]
```

### GET /project/:project_id

获取项目详情

```javascript
{
  "_id": <object_id>,
  "company_id": <company_id>,
  "is_archived": <Boolean>         // 项目归档
  "name": "...",                   // 任务标题
  "description": "...",            // 任务详情
  "owner": <ObjectId>,             // 创建人
  "is_owner": <Boolean>            // 当前用户是否为所有者
  "members": [{
    "_id": <user_id>,
    "type": <Int[Enum:0,1,2,3,4]>, // 成员类型
    "title": "...",                // 成员标题
  }, ...],                         // 项目成员
  "time_create": <Date>,           // 创建时间
  "time_update": <Date>,           // 更新时间
}
```

### POST /project/:project_id/member

添加成员

INPUT
```javascript
{
  "_id": <ObjectId>,
  "type": <String[Enum:1,2,3]>,
  "title": <String>,
}
```

### GET /project/:project_id/member

获取成员列表

OUTPUT
```javascript
[{
  "_id": <ObjectId>,
  "name": <String>,
  "avatar": <String>,
}...]
```

### DELETE /project/:project_id/member/:member_id

删除项目成员

### DELETE /project/:project_id

删除项目

INPUT
```javascript
{
  auth_check_token: <String> // 密码认证 token
}
```

### POST /project/:project_id/transfer

转让项目项目

INPUT
```javascript
{
  user_id: <ObjectId>,       // 目标用户
  auth_check_token: <String> // 密码认证 token
}
```
