# API Project

[返回目录](index.md)

项目

## 挂载点

```
/company/:company_id
```

## Table of Contents

...

## API function

### POST /project

添加项目

INPUT
```javascript
{
  name: <String>,
  description: <String>
}
```

### PUT /project/:project_id

更新项目信息

INPUT
```javascript
{
  name: <String>,
  description: <String>
}
```

### GET /project

获取全部项目

OUTPUT
```javascript
[
  {
    _id: <String>,
    name: <String>,
    logo: <String>,
    owner: <ObjectId>,
    is_member: <Boolean>,         //
  }
]
```

### GET /project/:project_id

获取项目详情

```javascript
{
  _id: <object_id>,
  company_id: <company_id>,
  is_archived: <Boolean>          // 项目归档
  name: <String>,                 // 任务标题
  description: <String>,          // 任务详情
  owner: {
    _id: <object_id>,
    name: <String>,
    avatar: <String>
  },                                // 创建人
  is_owner: <Boolean>,             // 当前用户是否为所有者
  is_admin: <Boolean>,             // 当前用户是否为管理员
  members: [{
    _id: <user_id>,
    type: <Int[Enum:0,1,2,3,4]>,  // 成员类型
    title: <String>,              // 成员标题
  }, ...],                        // 项目成员
  date_create: <Date>,            // 创建时间
  date_update: <Date>,            // 更新时间
}
```

### PUT /project/:project_id/logo

更新项目logo

INPUT
```javascript
{
  logo: <URL>,
}
```

### PUT /project/:project_id/logo/upload

上传项目logo

INPUT:
`Content-Type: multipart/form-data`
```javascript
{
  logo: <File>,
  crop_x: <Int>,       // optional
  crop_y: <Int>,       // optional
  crop_width: <Int>,   // optional
  crop_height: <Int>,  // optional
}
```

### POST /project/:project_id/tag

添加项目标签

INPUT
```javascript
{
  name: <String>,
  color: <String>
}
```

### GET /project/:project_id/tag

获取项目标签列表

INPUT
```javascript
[{
  _id: <ObjectId>,
  name: <String>,
  color: <String>,
}...]
```

### DELETE /project/:project_id/tag/:tag_id

删除项目标签

### POST /project/:project_id/member

添加成员

INPUT
```javascript
{
  _id: <ObjectId>,
  type: <String[Enum:1,2,3]>,
  title: <String>,
}
```

### GET /project/:project_id/member

获取成员列表

OUTPUT
```javascript
[{
  _id: <ObjectId>,
  type: <String[Enum]>,
  title: <String>,
  name: <String>,
  avatar: <URL>,
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

### PUT /project/:project_id/member/:member_id/type

设置成管理员或普通用户

INPUT
```javascript
{
  type: <ENUM:admin|normal>
}
```

### POST /project/:project_id/transfer

转让项目

INPUT
```javascript
{
  user_id: <ObjectId>,       // 目标用户
  auth_check_token: <String> // 密码认证 token
}
```

### PUT /project/:project_id/archived

归档项目

INPUT
```javascript
{
  archived: <Boolean>,       // 是否为归档项目
  auth_check_token: <String> // 密码认证 token
}
```

### GET /project/:project_id/activity

```javascript
[{
  _id: <ObjectId>,
  creator: <ObjectId>,            // 作者
  target_type: <String[Enum]>,    // 对象类型
  action: <String[Enum]>,         // 动作类型
  project: <ObjectId>,
  company: <ObjectId>,
  date_create: <Date>,
}...]
```

### POST /project/:project_id/discussion

```javascript
{
  title: <String>,
  content: <String>,
}
```

### GET /project/:project_id/discussion

QUERY: `type: creator|follower`

```javascript
[{
  _id: <ObjectId>,
  project_id: <ObjectId>,         // 关联项目
  tags: [<ObjectId>...],          // 关联标签
  creator: <ObjectId>,
  title: <String>,
  content: <String>,
  followers: [<ObjectId>...],
  comments: [<ObjectId>...],
  date_update: <Date>,
  date_create: <Date>
}...]
```

### GET /project/:project_id/discussion/:discussion_id

```javascript
{
  _id: <ObjectId>,
  project_id: <ObjectId>,         // 关联项目
  tags: [<ObjectId>...],          // 关联标签
  creator: <ObjectId>,
  title: <String>,
  content: <String>,
  followers: [<ObjectId>...],
  comments: [<ObjectId>...],
  date_update: <Date>,
  date_create: <Date>
}
```

### DELETE /project/:project_id/discussion/:discussion_id

### POST /project/:project_id/discussion/:discussion_id/follow

```javascript
{
  _id: <ObjectId>,  // followers id
}
```

### DELETE /project/:project_id/discussion/:discussion_id/follow/:follower_id

### POST /project/:project_id/discussion/:discussion_id/comment

```javascript
{
  to: <ObjectId>, // 评论的用户
  content: <String>,
}
```

### GET /project/:project_id/discussion/:discussion_id/comment

```javascript
[{
  _id: <ObjectId>,
  discussion_id: <ObjectId>,      // 关联讨论
  creator: <ObjectId>,            // 作者
  to: <ObjectId>,                 // @
  content: <String>,              // 提交时分析其中的“@”功能，并发送通知
  likes: <Int>,                   // 喜欢
  date_create: <Date>,         
}...]
```

### DELETE /project/:project_id/discussion/:discussion_id/comment/:comment_id

### project document

项目文件

挂载点：/project/:project_id

详见：[document](document.md)
