# API Task

[返回目录](index.md)

任务(REST)

挂载点：
* `/company/:company_id/project/:project_id/task`


## Table of Contents

* [POST /task](#post-task)
* [GET /task](#get-task)
* [GET /task/:task_id](#get-task-task_id)
* [GET /task/:task_id/comment](#get-task-task_id-comment)
* [GET /task/:task_id/log](#get-task-task_id-log)

## 基本操作

### POST /task

新建任务

只能在挂载点 `/company/:company_id/project/:project_id/task` 访问

INPUT
```javascript
{
  title:<String>,
  status: <String[Enum:processing,completed,paused,trashed]> //任务状态
  title: <String>,                // 任务标题
  description: <String>,          // 任务详情
  creator: <ObjectId>,          // 创建人
  assignee: <ObjectId>,         // 执行人
  followers: [<ObjectId>, ...], // 关注者
  date_start: <date>,          // 开始时间（optional）
  date_due: <date>,            // 截止时间（optional）
  priority: <0,1,2,3>,         // 优先级别
  subtask: [<String>, ...],    // 子任务
  tags: [<ObjectId>, ...],        // 标签
  attachments: [ObjectId,...]  // 附件objecid数组
}
```

### DELETE /task/:task_id

删除任务

## 更新任务信息

### PUT /task/:task_id/status

更新任务状态

```javascript
{
  status: <String[Enum:pending,processing,completed,paused,trashed]>
}
```

### PUT /task/:task_id/title

更新任务标题

INPUT
```javascript
{
  title: <String>
}
```

### PUT /task/:task_id/description

更新任务详情

INPUT
```javascript
{
  description: <String>
}
```

### PUT /task/:task_id/assignee

更新任务执行人

INPUT
```javascript
{
  assignee: <ObjectId>
}
```

### PUT /task/:task_id/priority

更新任务优先级

INPUT
```javascript
{
  priority: <Int[Enum:0,1,2,3]>
}
```

### PUT /task/:task_id/attachments

更新任务附件

INPUT
```javascript
{
  attachments: [objectId,objectId,...], // 文件的id数组
}
```

### PUT /task/:task_id/followers

添加关注者

INPUT
```javascript
{
  _id: <ObjectId>
}
```

### DELETE /task/:task_id/followers/:follower_id

移除关注者

### POST /task/:task_id/follow

添加自己为关注者

### POST /task/:task_id/unfollow

取消对任务的关注

### PUT /task/:task_id/tag

添加标签

INPUT
```javascript
{
  tag: <ObjectId>
}
```

### DELETE /task/:task_id/tag/:tag_id

删除标签

### PUT /task/:task_id/date_start

更新开始时间

INPUT
```javascript
{
  date_start: <ObjectId>
}
```

### PUT /task/:task_id/date_due

更新截止时间

INPUT
```javascript
{
  date_due: <ObjectId>
}
```

## 获取任务信息

### GET /task

任务检索

QUERY

| name | type | description |
| ----:| --- | --- |
| page | int | page number |
| pagesize | int | page size |
| keyword | string | search keyword |
| sort | string | field_name |
| order | [asc,desc] | sort method |
| status | list | comma separated list |
| assignee | list | user list |
| creator | list | user list |
| follower | list | user list |
| is_expired | int | 0 / 1 |
| is_loop | int | 0 / 1 |
| p_id | ObjectId | |
| date | date | task of this day |

OUTPUT
```javascript
[
  {
    _id:<String>,
    title:<String>,
    //...
  } // 参考任务详情页面
]
```

### GET /task/{:task_id}

获取任务详情

```javascript
{
  _id: <ObjectId>,
  company_id: <ObjectId>,
  project_id: <ObjectId>,
  parent_id: <ObjectId>,        // 父任务
  status: <1,2>                // 任务状态
  title: <String>,                // 任务标题
  content: <String>,              // 任务详情
  creator: {
    _id: <ObjectId>,
    name: <String>,
    avatar: <String>
  },                             // 创建人
  assignee: {
    _id: <ObjectId>,
    name: <String>,
    avatar: <String>
  },                             // 执行人
  followers: [{
    _id: <ObjectId>,
    name: <String>,
    avatar: <String>
  }, ...],                       // 关注者
  date_create: <Date>,         // 创建时间
  date_update: <Date>,         // 更新时间
  date_start: <date>,          // 开始时间（optional）
  date_due: <date>,            // 截止时间（optional）
  priority: <0,1,2,3>,         // 优先级别
  tag: [{
    _id: <ObjectId>,
    name: <String>,
    color: <String>
  }, ...],                        // 标签
  subtask: [{                    // 子任务
    _id: <ObjectId>,
    title: <String>,
    status: <String[Enum:processing,completed]>,
    date_create: <Date>,
    date_update: <Date>,
  }...]
}
```

### GET /task/{task_id}/comment

获取任务评论

```javascript
[{                  
  _id: <ObjectId>,
  user: {
    _id: <ObjectId>,
    name: <String>,
    avatar: <String>
  },
  content: <String>,
  time_add: <Date>,
}, ...]
```

### POST /task/{task_id}/comment

添加评论

```javascript
{
  content: <String>,
}
```

### DELETE /task/{task_id}/comment/:comment_id

删除评论

### GET /task/{taks_id}/activity

获取任务日志

```javascript
[{
  _id: <ObjectId>,
  creator: <ObjectId>,            // 作者
  target_type: <String[Enum]>,    // 对象类型
  action: <String[Enum]>,         // 动作类型
  task: <ObjectId>,               // optional
  project: <ObjectId>,            // optional
  company: <ObjectId>,            // optional
  date_create: <Date>,            // 创建时间
}]
```

添加子任务

### POST /task/{task_id}/subtask

INPUT

```javascript
{
  title: <String>
}
```

OUTPUT

```javascript
{
  _id: <ObjectId>,
  title: <String>,
  status: <String:processing>,
  date_create: <Date>,
  date_update: <Date>,
}
```

删除子任务

### DELETE /task/{task_id}/subtask/{subtask_id}


修改子任务状态

### PUT /task/{task_id}/subtask/{subtask_id}

INPUT

```javascript
{
  status: <String[Enum:processing,completed]>
}
```

### PUT /task/:task_id/loop

更新循环任务

INPUT
```javascript
{
  loop: {
    type: null|<String[Enum:day,weekday,month,year]>,
    info: [Number...], // type == weekday then number: 0,6, type == month then number: 0-30(0为1号),
    end: {
      type: null|<String[Enum:date,times]>,
      date: Date,     // type == date 有该字段
      times: Number,  // type == times 有该字段
    }
  }
}
```

### PUT /task/:task_id/checker

更新任务审核人

INPUT
```javascript
{
  checker: <ObjectId>
}
```

## 挂载点

* `/company/:company_id/task` 公司任务
* `/task`  工作台任务

### GET /

任务检索

QUERY

| name | type | description |
| ----:| --- | --- |
| page | int | page number |
| pagesize | int | page size |
| keyword | string | search keyword |
| status | list | completed / processing |
| type | string | assignee / creator / follower |

'keyword', 'status', 'type'  all is optional

OUTPUT
```javascript
[
  {
    _id:<String>,
    title:<String>,
    //...
  } // 参考任务详情页面
]
```
