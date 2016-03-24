# API task

项目(REST)

## Table of Contents

* [POST /company/:company_id/project](#post-company-company_id-project)
* [GET /company/:company_id/project](#get-company-company_id-project)
* [GET /company/:company_id/project/:project_id](#get-company-company_id-project-project_id)
* [DELETE /company/:company_id/project/:project_id](#delete-company-company_id-project-project_id)

## API function

### POST /company/:company_id/project

INPUT
```javascript
{
  "name": "",
  "description": "",
  "logo": "path/to/logo.png",
  //"owner": <user_id>,
}
```

### GET /company/:company_id/project

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

### GET /company/:company_id/project/:project_id

获取项目详情

```javascript
{
  "_id": <object_id>,
  "company_id": <company_id>,
  "is_archived": <Boolean>       // 项目归档
  "name": "...",                 // 任务标题
  "description": "...",          // 任务详情
  "owner": {
    "_id": <user_id>,
    "name": "...",
    "avatar": "..."
  },                             // 项目所有者
  "is_owner": <Boolean>          // 当前用户是否为所有者
  "members": [{
    "_id": <user_id>,
    "name": "...",
    "avatar": "..."
  }, ...],                       // 项目成员
  "time_create": <Date>,         // 创建时间
  "time_update": <Date>,         // 更新时间
}
```

### DELETE /company/:company_id/project/:project_id

删除项目
