| Type | Recipients | Web | Wechat | Email |
| ---- | ---------- | --- | ------ | ----- |
| approval | 申请人，审核人，抄送 | ? Y | ? Y | - |
| announcement | 接收部门 | ? Y | - | - |
| company_member_invite | 被邀请者 | ! | ! | ! |
| company_member_update | 成员信息更新 | ? Y | - | - |
| company_member_update_modify | 被修改者 | ? Y | - | - |
| company_member_update_setadmin | 被设置者 | ? Y | - | - |
| company_member_update_removeadmin | 被设置者 | ? Y | - | - |
| company_member_remove | 被移除者 | ! | - | - |
| structure_member_add | 被添加者 | ? Y | - | - |
| structure_member_remove | 被移除者 | ? Y | - | - |
| project_discussion | 关注者 | ? Y | - | - |
| project_member_add | 被添加成员 | ? Y | - | - |
| project_member_remove | 被移除成员 | ? Y | - | - |
| project_member_setadmin | 被设置成员 | ? Y | - | - |
| project_member_removeadmin | 被设置成员 | ? Y | -| - |
| project_transfer | 相关成员 | ! | - | - |
| project_quit | 管理员，成员本身 | ! | - | - |
| task_assigned | 执行者 | ? Y | ? N | - |
| task_dailyreport | 执行者 | ? Y | ? Y | - |
| task_update | 关注者 | ? Y | - | - |
| task_reply | 关注者 | ? Y | - | - |
| request_accept | 管理员 | ! | ? Y | - |
| request_reject | 管理员 | ! | - | - |
| schedule_remind | 用户 | ! | ? Y | - |
| attendance | 用户 | ! | ? Y | - |

# 应用中心提示：

## 活动：

target_type: app.report
action: submit
report: {
  title,
  type,
  departments,
  company_id,
  is_public,
  creator  
}

## 汇报

target_type: app.activity
action: create
activity: {
  user_id,company_id,
  report_target,
  type,
  date_repor
}
