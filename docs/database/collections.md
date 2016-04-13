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
  task: {
    follow: [<ObjectId>...],
    creator: [<ObjectId>...],
    assignee: [<ObjectId>...],
  },
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
  },
  projects: [<ObjectId>...],
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

### discussion

项目讨论

```javascript
{
  _id: <ObjectId>,
  project_id: <ObjectId>,         // 关联项目
  tags: [<ObjectId>...],          // 关联标签
  title: <String>,
  content: <String>,
  date_create: <Date>,
  date_update: <Date>,
}
```

### discussion.comments

项目评论

```javascript
{
  _id: <ObjectId>,
  task_id: <ObjectId>,            // 关联讨论
  creator: <ObjectId>,                // 作者
  content: <String>,                  // 提交时分析其中的“@”功能，并发送通知
  likes: <Int>,                       // 喜欢
  date_create: <Date>,                // 创建时间
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
  company_id: <ObjectId>,          // 关联公司
  project_id: <ObjectId>,          // 关联项目
  title: <String>,                 // 任务标题
  description: <String>,           // 任务详情
  creator: <ObjectId>,             // 任务创建者
  assignee: <ObjectId>             // 任务执行人
  followers: [<ObjectId>...],      // 任务关注者列表
  date_start: <Date>,              // 开始时间
  date_due: <Date>,                // 截止时间
  priority: <Int[Enum:0,1,2,3]>,   // 优先级别
  tags: [<ObjectId>...],           // 标签
  comments: [<ObjectId>...],       // 评论内容
  time_create: <Date>,             // 创建时间
  time_update: <Date>,             // 更新时间
}
```

### task.comments

任务评论
```javascript
{
  _id: <ObjectId>,
  task_id: <ObjectId>,             // 关联文章
  creator: <ObjectId>,             // 作者
  content: <String>,               // 提交时分析其中的“@”功能，并发送通知
  likes: <Int>,                    // 喜欢
  date_create: <Date>,             // 创建时间
}
```

### task.log

任务活动记录

```javascript
{
  _id: <ObjectId>,
  task_id: <ObjectId>,            // 关联文章
  creator: <ObjectId>,            // 作者
  type: <String[enum=             // 类型
    create,                       // 创建
    complete,                     // 完成
    reopen,                       // 重新开启
    title,                        // 标题
    description                   // 描述
    tag,                          // 标签
    followers,                    // 关注者
  ],
  content: <
  date_create: <Date>,            // 创建时间
}
```

### article.category

文章分类

```javascript
{
  _id: <ObjectId>,
  company_id: <ObjectId>,
  parent_id: <ObjectId>,
  children: [<ObjectId>...],
  name: <String>,
  date_create: <Date>,
}
```

### article

知识
```javascript
{
  _id: <ObjectId>,
  category_id: <ObjectId>,       // 文章分类
  creator: <ObjectId>,           // 作者
  title: <String>,               // 标题
  content: <String>,             // 内容
  hits: <Int>,                   // 点击数
  comments: [<ObjectId>...],     // 评论
  date_create: <Date>,           // 创建时间
  date_update: <Date>,           // 创建时间
}
```

### article.comments

文章评论
```javascript
{
  _id: <ObjectId>,
  article_id: <ObjectId>,        // 关联文章
  creator: <ObjectId>,           // 作者
  content: <String>,             // 提交时分析其中的“@”功能，并发送通知
  likes: <Int>,                  // 喜欢
  date_create: <Date>,           // 创建时间
}
```

### annoucement

公告

```javascript
{
  _id: <ObjectId>,
  title: <String>,
  content: <String>,
  creator: <ObjectId>,
  date_publish: <Date>,
  date_create: <Date>,
}
```

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
