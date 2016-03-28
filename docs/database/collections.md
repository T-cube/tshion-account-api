# TLifang 数据库结构文档

本文档使用类似 [JODL](jodl.md) 来描述 document 结构

## Collections

### user

用户信息

```javascript
{
  _id: <ObjectId[auto]>,
  // account information
  email: <String>,
  mobile: <String>,
  password: <HASH>,
  // basic information
  avatar: <URL>,
  name: <String>,
  description: <String>,
  sex: <String[enum=M,F]>,
  birthdate: <Date>,
  date_join: <Date>,
  address: <String>,
  // relations
  companies: [<ObjectId>...],
  projects: [<ObjectId>...],
}
```

### user.task

用户关联任务

```javascript
{
  follower: [<ObjectId>...],
  creator: [<ObjectId>...],
  assignee: [<ObjectId>...],
}
```

### company

企业信息

```javascript
{
  _id: <ObjectId[auto]>,
  name: <String>,
  description: <String>,
  owner: <ObjectId[link=user._id]>,
  members: [{
    _id: <ObjectId[link=user._id]>,
    name: <String>,
    mobile: <String>,
    birthdate: <Date>,
    joindate: <Date>,
    email: <String[email]>,
    address: <String>,
    sex: <String[enum=M,F],
  }...],
  structure: <Structure:> {
    _id: <ObjectId>,
    name: <String>,
    positions: [<String>...],
    members: [{
      _id: <ObjectId[link=user._id]>,
      title:
    }...],
    children: [<Structure>...],
  }
}
```

### project

项目

```javascript
{
  _id: <ObjectId>,
  company_id: <ObjectId>,         // 所属企业
  logo: <URL>                     // 项目图标
  is_archived: <Bool>             // 项目是否为归档
  name: <String>,                 // 项目标题
  description: <String>,          // 项目详情
  owner: <ObjectId>,              // 项目所有者
  admins: [<ObjectId>...],        // 管理员
  members: [<ObjectId>...],       // 项目成员
  date_create: <Date>,            // 创建时间
}
```

### project.task

项目任务连接

```javascript
//TODO
```

### task

任务

```javascript
{
  _id: <ObjectId>,
}
```

###


### file

文件
```javascript
{
  _id: <ObjectId>,
  name: <String>,
  type: <String>,     // file mime-type
  md5: <String>,
  size: <Int>,
  url: <URL>,
  thumb: <URL>,
}
```
