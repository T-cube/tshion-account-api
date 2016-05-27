# TLifang 数据库结构文档

本文档使用类似 [JODL](jodl.md) 来描述 document 结构

## Collections

### auth_check_token

用户临时校验 token

```javascript
{
  _id: <ObjectId>,
  user_id: <ObjectId>,
  token: <String>,
  expires: <Date>,
}
```

### user

用户信息

```javascript
{
  _id: <ObjectId[auto]>,
  // account information
  email: <String>,
  email_verified: <Boolean>,
  mobile: <String>,
  mobile_verified: <Boolean>,
  password: <HASH>,
  // basic information
  avatar: <URL>,
  name: <String>,
  description: <String>,
  sex: <String[Enum:M,F]>,
  birthdate: <Date>,
  // address
  address: {
    country: <String>,
    province: <String>,
    city: <String>,
    address: <String>,
  },
  // date of join OA system
  date_join: <Date>,
  locale: <String>,
  timezone: <String>,
  options: {
    notice_request: <Boolean>,
    notice_project: <Boolean>,
  },
  current_company: <ObjectId>,
  // relations
  companies: [<ObjectId>...],
  projects: [<ObjectId>...],
  task: [{
    _id: <ObjectId>,
    company_id: <ObjectId>,
    project_id: <ObjectId>,
    is_creator: <Boolean>,
    is_assignee: <Boolean>,
  }...],
}
```

### company

企业信息

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
    type: <String[Enum]>,
    status: <String[Enum]>,
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
      type: <String[Enum]>,
    }...],
    children: [<Structure>...],
  },
  projects: [<ObjectId>...],
}
```

关于公司成员类型 `members.type`：

| Value | Title | Description |
| ----- | ----- | ----------- |
| `normal` | 普通成员 | 可操作任务、评论等常规任务 |
| `admin` | 管理员 | 可添加、移除成员 |
| `owner` | 所有者 | 除管理员权限外，可设置设置其他管理员，可移交项目 |

关于公司成员状态 `members.status`：

| Value | Title | Description |
| ----- | ----- | ----------- |
| `banned` | 被禁用 | 无法操作 |
| `pending` | 未接受 | 未处理邀请 |
| `normal` | 正常 | 正常成员 |
| `rejected` | 被拒绝 | 决绝邀请 |

关于组织架构成员类型 `structure.members.type`：

| Value | Title | Description |
| ----- | ----- | ----------- |
| `normal` | 普通成员 | 可操作任务、评论等常规任务 |
| `admin` | 管理员 | 可添加、移除成员 |

### project

项目

```javascript
{
  _id: <ObjectId>,
  company_id: <ObjectId>,           // 所属企业
  logo: <URL>                       // 项目图标
  is_archived: <Bool:false>         // 项目是否为归档
  name: <String>,                   // 项目标题
  description: <String>,            // 项目详情
  owner: <ObjectId>,                // 项目所有者
  //admins: [<ObjectId>...],        // 管理员
  members: [{
    _id: <ObjectId>,
    type: <String[Enum]>,           // 成员类型
    title: <String>,                // 成员岗位
  }...],                            // 项目成员列表
  tags: [<objectId>...],            // 项目标签
  files: [<objectId>...],           // 项目文件
  date_create: <Date>,              // 创建时间
}
```

关于成员类型 `members.type`：

| Value | Title | Description |
| ----- | ----- | ----------- |
| `guest` | 访客 | 只可浏览、关注，无法修改项目内容 |
| `normal` | 普通成员 | 可操作任务、评论等常规任务 |
| `admin` | 管理员 | 可添加、移除成员 |
| `owner` | 所有者 | 除管理员权限外，可设置设置其他管理员，可移交项目 |
| `supervisor` | 监察者 | 与访客一致，但对其他成员不可见（此种类型待定） |

### request

关系申请（公司成员、好友关系）

```javascript
{
  _id: <ObjectId>,
  from: <ObjectId>,         // 申请人
  to: <ObjectId>,           // 被申请人
  type: <String[Enum]>,     // 申请类型
  object: <ObjectId>,       // 申请对象
  status: <String[Enum]>,   // 申请状态
  date_create: <Date>,      // 创建日期
}
```

关于 `type`

| Value | Title | Description |
| ----- | ----- | ----------- |
| `company` | 公司 | 添加公司成员时发出 |

关于 `status`

| Value | Title | Description |
| ----- | ----- | ----------- |
| `pending` | 待确认 | 请求已发出，待被申请人确认 |
| `accepted` | 已通过 | 被申请人通过了申请 |
| `rejected` | 已拒绝 | 被申请人通过了申请 |

### discussion

项目讨论

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

### discussion.comments

项目评论

```javascript
{
  _id: <ObjectId>,
  discussion_id: <ObjectId>,      // 关联讨论
  creator: <ObjectId>,            // 作者
  to: <ObjectId>,                 // @
  content: <String>,              // 提交时分析其中的“@”功能，并发送通知
  likes: <Int>,                   // 喜欢
  date_create: <Date>,            // 创建时间
}    
```    

### tags

项目标签

```javascript
{
  _id: <ObjectId>,
  project_id: <ObjectId>,         // 关联项目
  name: <String>,                 // 标签名称
  color: <String>,                // 标签颜色
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
  status: <String[Enum]>           // 任务状态(1)
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
  date_create: <Date>,             // 创建时间
  date_update: <Date>,             // 更新时间
}
```

(1)关于任务状态 `status`

| Value | Title | Description |
| ----- | ----- | ----------- |
| pending | 未开启 | 任务处于未开启状态，用于设置开始时间的任务 |
| processing | 正在进行 | 任务正在进行 |
| completed | 已完成 | 任务已完成√ |
| paused | 暂停 | 任务处于暂停状态 |
| deleted | 已删除 | 任务位于垃圾篓 |

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
  company_id: <ObjectId>,
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

### announcement

公告

```javascript
{
  _id: <ObjectId>,
  company_id: <ObjectId>,
  title: <String>,
  content: <String>,
  type: <Enum:news|notice>,       // 类型
  is_published: <Bool>,           // 发布，草稿
  from: {
    creator: <ObjectId>,          // 创建人
    department: <ObjectId>,       // 发起部门
  },
  to: {
    member: [<ObjectId>...],      // 接收成员
    department: [<ObjectId>...],  // 接收部门
  },
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

### approval

#### approval.template.master

```javascript
{
  _id: <ObjectId>,
  company_id: <ObjectId>,
  reversions: [<ObjectId>...],
  current: <ObjectId>,
}
```

#### approval.template

审批类型

```javascript
{
  _id: <ObjectId>,
  master_id: <ObjectId>,
  company_id: <ObjectId>,
  name: <String>,
  description: <String>,
  scope: [<ObjectId>...], // 适用部门
  status: <ENUM>,
  steps: [{
    _id: <ObjectId>,
    approver: {
      _id: <ObjectId>,
      type: <ENUM:department|member>
    }
    copy_to: [{
      _id: <ObjectId>,
      type: <ENUM:department|member>,
    }...]
  }...],
  forms: [{
    _id: <ObjectId>,
    title: <String>,
    form_type: <ENUM:text|textarea|date...>
  }]
}
```

#### approval.item

用户审批

```javascript
{
  _id: <ObjectId>,
  template: <ObjectId>, // 申请类型
  from: <ObjectId>, // 申请人
  company_id: <ObjectId>,
  department: <ObjectId>,
  apply_date: <Date>,
  status: <ENUM:processing|approved|rejected|revoked>,
  step: <ObjectId>,
  content: <String>,
  files: [<ObjectId>...], // 附件
  steps: [{
    _id: <ObjectId>,
    approver: <ObjectId>,
    status: <Enum:pending|approved|rejected>,
    create_time: <Date>,
    log: <String> // 审批记录
  }...],
  forms: [{
    _id: <ObjectId>,
    value: <String>
  }...]
}
```

### approval.user

用户对应flow

```javascript
{
  _id: <ObjectId>,
  map: [{
    company_id: <ObjectId>,
    flow_id: <ObjectId>
  }]
}
```

#### approval.flow

审批流程

```javascript
{
  _id: <ObjectId>,
  apply: [<ObjectId>...],
  copy_to: [<ObjectId>...],
  approve: [{
    _id: <ObjectId>, // approval item id
    step: <ObjectId>
  }...]
}
```

### document

#### document.dir

```javascript
{
  _id: <ObjectId>,
  company_id: <ObjectId>,
  name: <String>,
  parent_dir: <ObjectId>,
  updated_by: <ObjectId>,
  date_update: <Date>,
  dirs: [ObjectId...],
  files: [ObjectId...],
}
```

#### document.file

文档

```javascript
{
  _id: <ObjectId>,
  dir_id: <ObjectId>,
  author: <ObjectId>,
  title: <String>,
  description: <String>,
  content: <String>,
  mimetype: <String>,
  updated_by: <ObjectId>,
  date_update: <Date>,
  date_create: <Date>,
  path: <String>,
  size: <Number>,
}
```

#### document.token

下载token

```javascript
{
  _id: <ObjectId>,
  token: <String>,
  user: <ObjectId>,
  file: <ObjectId>,
  expires: <Date>,
}
```

### notification

消息

```javascript
{
  _id: <ObjectId>,
  from: <ObjectId>,
  to: <ObjectId>,
  target_type: <String[Enum]>,
  action: <String[Enum]>,         // 动作类型
  target_id: <ObjectId>,
  is_read: <Boolean>,
  date_create: <Date>,
}
```

关于消息类型 `type`：

| Value | Title | Description |
| ----- | ----- | ----------- |
| `request` | 成员申请 | 成员加入请求 |
| `company` | 公司 | 公司消息 |
| `project` | 项目 | 项目消息 |
| `task` | 任务 | 任务消息 |

### activity

日志（活动）

```javascript
{
  _id: <ObjectId>,
  creator: <ObjectId>,            // 作者
  target_type: <String[Enum]>,    // 对象类型
  action: <String[Enum]>,         // 动作类型
  task: <ObjectId>,               // optional
  project: <ObjectId>,            // optional
  company: <ObjectId>,            // optional
  date_create: <Date>,            // 创建时间
}
```

### attendance.setting

```javascript
{
  _id: <ObjectId>,
  company: <ObjectId>,
  is_open: <Boolean>,
  time_start: <String>,
  time_end: <String>,
  ahead_time: <Int>,
  workday: [<Int>...],
  location:[<String>...],
  white_list: [<ObjectId>...], // 白名单用户
  workday_special: [{
    date: <String>,
    title: <String>,
  }...],
  holiday: [{
    date: <String>,
    title: <String>,
  }...],
  date_update: <Date>,
}
```

### attendance.sign

```javascript
{
  _id: <ObjectId>,
  user: <ObjectId>,
  yaer: <Int>,
  month: <Int>,
  data: [{
    date: <Int>,
    time_signin: <Date>,
    time_signout: <Date>,
  }...]
}
```

### attendance.audit

```javascript
{
  _id: <ObjectId>,
  user: <ObjectId>,
  company: <ObjectId>,
  date: <String>,
  date_create: <Date>,
  data: [{
    type: <String[Enum=sign_in,sign_out]>,
    date: <Date>,
  }...]
  reason: <String>,     // 漏刷原因
  auditor: <ObjectId>,
  date_audit: <Date>,
  status: <String[Enum=pending,accepted,rejected]>,
}
```

### attendance.record

```javascript
{
  _id: <ObjectId>,
  company: <ObjectId>,
  yaer: <Int>,
  month: <Int>,
  data: [{
    user: <ObjectId>,
    normal: <Int>,          // 正常工作天数
    late: <Int>,            // 迟到
    leave_early: <Int>,     // 早退
    absent: <Int>,          // 缺勤
    patch: <Int>,           // 补签
    business_trip: <Int>,   // 出差
    paid_vacation: <Int>,   // 带薪假期
    nopaid_vacation: <Int>, // 不带薪假期
    extra_work: <Int>,      // 加班
    workday_all: <Int>,     // 应勤
    workday_real: <Int>,    // 实际出勤
  }...]
}
```

### schedule

日程

```javascript
{
  _id: <ObjectId>,
  title: <String>,
  description: <String>,
  is_full_day: <Boolean>,
  time_start: <Date>,
  time_end: <Date>,
  repeat_end: <Date>,
  repeat: {
    type: <String[Enum=none,day,week,month,year,weekday]>,
    info: [<String>...],
  },
  remind: {
    type: <String[Enum=none,exact,minute,hour,day,week]>,
    num: <Int>,
  },
  creator: <ObjectId>,
  date_create: <Date>,
  date_update: <Date>,
}
```

### user.reminding

提醒

```javascript
{
  _id: <ObjectId>,
  target_type: <String[Enum=schedule]>,
  target_id: <ObjectId>,
  time: <Date>
}
```
