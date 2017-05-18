# 应用中心API

挂载点：
* `/app/:app_id/company/:company_id`

## Table of Contents

<!-- * [GET /company/info](#companyInfo) -->
* [POST /storage](#storage)
<!-- * [GET /member/list](#memberList)
* [GET /structure/info](#structureInfo) -->
* [GET /project/info](#projectInfo)
* [GET /approval/template](#template)
* [POST /approval/item](#approvalCreate)
* [GET /approval/related](#related)
* [GET /document/dir/:dir_id](#dir)
* [POST /document/dir/:dir_id/upload](#upload)
* [POST /document/dir/:dir_id/create](#create)
* [GET /document/file/:file_id](#file)
* [GET /document/file/:file_id/download](#download)

<!-- TODO approval hold on -->


<!-- ### [GET /company/info](id:companyInfo)

获取团队名称、版本等信息

OUTPUT:
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
  plan: {}
  modules: [
    MODULE_PROJECT
    MODULE_TASK
    MODULE_DOCUMENT
    MODULE_APPROVAL
    MODULE_ANNOUNCEMENT
    MODULE_ATTENDANCE
    MODULE_STRUCTURE
  ]
}
``` -->

### [POST /storage](id:storage)

应用存储数据

INPUT:

```javascript
{
  db_name: <String>,
  content: <Object>,
  type: <String>
}
```

<!-- ### [GET /member/list](id:memberList)

获取团队成员列表

OUTPUT:

```javascript
[{
  _id: <ObjectId>,
  name: <String>,
  mobile: <String>,
  birthdate: <Date>,
  joindate: <Date>,
  email: <String[email]>,
  address: <String>,
  sex: <String[Enum:M,F]>,
}...]
```

### [GET /structure/info](id:structureInfo)

获取团队组织架构信息

OUTPUT:

```javascript
{
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
}
``` -->

### [GET /project/info](id:projectInfo)

获取团队项目信息

OUTPUT:

```javascript
[
  {
    _id: <String>,
    name: <String>,
    logo: <String>,
    owner: <ObjectId>,
    is_member: <Boolean>,         
  }...
]
```

### [GET /document/dir/:dir_id](id:dir)

获取团队文档列表

OUTPUT:

```javascript
{
  _id: <ObjectId>,
  name: <String>,
  dirs: [{
    _id: <ObjectId>,
    name: <String>,
  }...],
  files: [{
    _id: <ObjectId>,
    name: <String>,
    mimetype: <String>,
    size: <Number>,
  }...],
  path: [{
    _id: <ObjectId>,
    name: <String>,
  }...],
  updated_by: <ObjectId>,
  date_update: <Date>，
  date_create: <Date>，
}
```

### [GET /document/file/:file_id](id:file)

读取文件详情

OUTPUT:

```javascript
{
  _id: <ObjectId>,
  name: <String>,
  description: <String>,
  author: <String>,
  content: <String>,
  date_update: <Date>,
  date_create: <Date>,
  updated_by: <ObjectId>,
  path: <String>,
  mimetype: <String>,
  size: <Number>,
}
```

### [GET /approval/template](id:template)

获取审批模板

QUERY:

```javascript
{
  user: <ObjectId>,
}
```

OUTPUT:

```javascript
[{
  _id: <ObjectId，
  name: <String>,
  description: <String>,
  scope: [<ObjectId>...],
  status: <ENUM>,
  steps: [{
    _id: <ObjectId>,
    approver: {
      _id: <ObjectId>,
      type: <String[Enum=member|department]>
    },
  }...],
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <ENUM:text,textarea,date...>
  }]
}...]
```

### [POST /approval/item](id:approvalCreate)

提交审批模板

INPUT:

```javascript
{
  template: <ObjectId>,
  department: <ObjectId>,
  content: <String>,
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <ENUM:text,textarea,date...>,
    value: <String>
  }]
}
```

### [GET /approval/related](id:related)

QUERY:

```javascript
{
  status: <Emun:[processing|resolved]>,
  template: <ObjectId>,
  page: <Int>,
}
```

OUTPUT:

```javascript
{
  page: <Number>,
  pagesize: <Number>,
  totalrows: <Number>,
  list: [{
    _id: <ObjectId>,
    template: {
      _id: <ObjectId>,
      name: <String>,
    },
    from: {
      _id: <ObjectId>,
      name: <String>,
    },
    department: {
      _id: <ObjectId>,
      name: <String>,
    },
    apply_date: <Date>,
    status: <ENUM>,
    content: <String>,
    log: <String>
  }...]
}
```

### [POST /document/dir/:dir_id/upload](id:upload)

上传文件

INPUT:

```javascript
{
  document: <File[multiple]>,
  dir_id: <ObjectId>
}
```

### [POST /document/dir/:dir_id/create](id:create)

添加文档

INPUT:

```javascript
{
  name: <String>,
  description: <String>,
  content: <String>,
}
```
