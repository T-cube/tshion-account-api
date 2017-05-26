# APP notebook API 文档

## request /app-center/app/notebook

query:
```javascript
{
  target: <String>, // ['user', 'tag', 'note', 'like', 'notebook', 'shared', 'comment', 'note', 'noteAddTag', 'noteDeleteTag', 'noteShare']
  user_id: <String>,
  company_id: <String>,
  note_id: <String>,
  tag_id: <String>,  
}
```
 
