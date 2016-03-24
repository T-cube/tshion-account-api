# API task

任务(REST)

## Table of Contents

* [GET /project/:project_id/task](#get-project-project_id-task)
* [GET /project/:project_id/task/:task_id](#get-project-project_id-task-task_id)
* [GET /project/:project_id/task/:task_id/comment](#get-project-project_id-task-task_id-comment)
* [GET /project/:project_id/task/:task_id/log](#get-project-project_id-task-task_id-log)

## API function

### GET /project/:project_id/task

获取全部任务

OUTPUT
```javascript
[
  {
    "_id":"...",
    "title":"...",
    //...
  }
]
```

### GET /project/:project_id/task/{:task_id}

获取任务详情

```javascript
{
  "_id": <object_id>,
  "company_id": <company_id>,
  "project_id": <project_id>,
  "parent_id": <task_id>,        // 父任务
  "status": <"PENDING", "PROCESSING", "COMPLETED"> //任务状态
  "title": "...",                // 任务标题
  "content": "...",              // 任务详情
  "creator": {
    "_id": <user_id>,
    "name": "...",
    "avatar": "..."
  },                             // 创建人
  "owner": {
    "_id": <user_id>,
    "name": "...",
    "avatar": "..."
  },                             // 执行人
  "follower": [{
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

### GET /project/:project_id/task/{task_id}/comment

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

### GET /project/:project_id/task/{taks_id}/log

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
