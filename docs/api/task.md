# API Task

[返回目录](index.md)

任务(REST)

挂载点：
* `/company/:company_id/project/:project_id/task`
* `/task`

## Table of Contents

* [POST /task](#post-task)
* [GET /task](#get-task)
* [GET /task/:task_id](#get-task-task_id)
* [GET /task/:task_id/comment](#get-task-task_id-comment)
* [GET /task/:task_id/log](#get-task-task_id-log)

## 新建任务

### POST /task

新建任务

只能在挂载点 `/company/:company_id/project/:project_id/task` 访问

INPUT
```javascript
[
  {
    "_id":"...",
    "title":"...",
    //"company_id": <ObjectId>,
    //"project_id": <ObjectId>,
    //"parent_id": <ObjectId>,        // 父任务
    "status": <String[Enum:pending,processing,completed,paused,trashed]> //任务状态
    "title": "...",                // 任务标题
    "description": "...",          // 任务详情
    "creator": <ObjectId>,          // 创建人
    "assignee": <ObjectId>,         // 执行人
    "followers": [<ObjectId>, ...], // 关注者
    //"time_create": <Date>,       // 创建时间
    //"time_update": <Date>,       // 更新时间
    "date_start": <date>,          // 开始时间（optional）
    "date_due": <date>,            // 截止时间（optional）
    "priority": <0,1,2,3>,         // 优先级别
    //"subtask": [<ObjectId>, ...], // 子任务
    "tag": [<ObjectId>, ...],        // 标签
  }
]
```

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
  title: <String>
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

### POST /task/:task_id/followers

添加关注者

INPUT
```javascript
{
  _id: <ObjectId>
}
```

### DELETE /task/:task_id/followers/:follower_id

移除关注者

### POST /task/:task_id/tag

添加标签

INPUT
```javascript
{
  tag: <ObjectId>
}
```

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

OUTPUT
```javascript
[
  {
    "_id":"...",
    "title":"...",
    //...
  } // 参考任务详情页面
]
```

### GET /task/{:task_id}

获取任务详情

```javascript
{
  "_id": <ObjectId>,
  "company_id": <ObjectId>,
  "project_id": <ObjectId>,
  "parent_id": <ObjectId>,        // 父任务
  "status": <1,2>                // 任务状态
  "title": "...",                // 任务标题
  "content": "...",              // 任务详情
  "creator": {
    "_id": <ObjectId>,
    "name": "...",
    "avatar": "..."
  },                             // 创建人
  "assignee": {
    "_id": <ObjectId>,
    "name": "...",
    "avatar": "..."
  },                             // 执行人
  "followers": [{
    "_id": <ObjectId>,
    "name": "...",
    "avatar": "..."
  }, ...],                       // 关注者
  "time_create": <Date>,         // 创建时间
  "time_update": <Date>,         // 更新时间
  "date_start": <date>,          // 开始时间（optional）
  "date_due": <date>,            // 截止时间（optional）
  "priority": <0,1,2,3>,         // 优先级别
  "subtask": [<ObjectId>, ...],   // 子任务
  "tag": [{
    "_id": <ObjectId>,
    "name": "tag name",
    "color": "#ABCDEF"
  }, ...],                       // 标签
}
```

### GET /task/{task_id}/comment

获取任务评论

```javascript
[{                  
  "_id": <ObjectId>,
  "user": {
    "_id": <ObjectId>,
    "name": "...",
    "avatar": "..."
  },
  "content": "",
  "time_add": <Date>,
}, ...]
```

### POST /task/{task_id}/comment

添加评论

```javascript
{
  "ObjectId": <ObjectId>,
  "content": <String>,
  "time_add": <Date>
}
```

### GET /task/{taks_id}/log

获取任务日志

```javascript
"log": [{
  type: "task",
  from: {
    "_id": <ObjectId>,
    "name": "...",
    "avatar": "..."
  },
  to: {
    "_id": <ObjectId>,
    "name": "...",
    "avatar": "..."
  }
  content: "...",
  time: <Date>
}]
```
