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

## API function

### POST /task

新建任务

只能在挂载点 `/company/:company_id/project/:project_id/task` 访问

INPUT
```javascript
[
  {
    "_id":"...",
    "title":"...",
    "company_id": <company_id>,
    "project_id": <project_id>,
    "parent_id": <task_id>,        // 父任务
    "status": <1,2>                //任务状态
    "title": "...",                // 任务标题
    "description": "...",          // 任务详情
    "creator": <user_id>,          // 创建人
    "assignee": <user_id>,         // 执行人
    "followers": [<user_id>, ...], // 关注者
    //"time_create": <Date>,       // 创建时间
    //"time_update": <Date>,       // 更新时间
    "date_start": <date>,          // 开始时间（optional）
    "date_due": <date>,            // 截止时间（optional）
    "priority": <0,1,2,3>,         // 优先级别
    //"subtask": [<task_id>, ...], // 子任务
    "tag": [<tag_id>, ...],        // 标签
  }
]
```

### GET /task

获取全部任务

QUERY

| name | type | description |
| ----:| --- | --- |
| page | int | page number |
| pagesize | int | page size |

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

### GET /task/search

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
  "_id": <object_id>,
  "company_id": <company_id>,
  "project_id": <project_id>,
  "parent_id": <task_id>,        // 父任务
  "status": <1,2>                // 任务状态
  "title": "...",                // 任务标题
  "content": "...",              // 任务详情
  "creator": {
    "_id": <user_id>,
    "name": "...",
    "avatar": "..."
  },                             // 创建人
  "assignee": {
    "_id": <user_id>,
    "name": "...",
    "avatar": "..."
  },                             // 执行人
  "followers": [{
    "_id": <user_id>,
    "name": "...",
    "avatar": "..."
  }, ...],                       // 关注者
  "time_create": <Date>,         // 创建时间
  "time_update": <Date>,         // 更新时间
  "date_start": <date>,          // 开始时间（optional）
  "date_due": <date>,            // 截止时间（optional）
  "priority": <0,1,2,3>,         // 优先级别
  "subtask": [<task_id>, ...],   // 子任务
  "tag": [{
    "_id": <tag_id>,
    "name": "tag name",
    "color": "#ABCDEF"
  }, ...],                       // 标签
}
```

### GET /task/{task_id}/comment

获取任务评论

```javascript
[{                  
  "_id": <object_id>,
  "user": {
    "_id": <user_id>,
    "name": "...",
    "avatar": "..."
  },
  "content": "",
  "time_add": <Date>,
}, ...]
```

### GET /task/{taks_id}/log

获取任务日志

```javascript
"log": [{
  type: "task",
  from: {
    "_id": <user_id>,
    "name": "...",
    "avatar": "..."
  },
  to: {
    "_id": <user_id>,
    "name": "...",
    "avatar": "..."
  }
  content: "...",
  time: <Date>
}]
```
