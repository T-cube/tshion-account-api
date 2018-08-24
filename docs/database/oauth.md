# Oauth Related Collections

## Description

## Basic Type Define

```javascript
OauthToken: String[32];
```

## Tables

### Collection `oauth.clients`

```javascript
{
  _id: ObjectID,
  client_id: String,
  client_secret: String
}
```

### Collection `oauth.code`

```javascript
{
  _id: ObjectID,
  user_id: ObjectID
  client_id: String,
  code: String,
  expires: Date,
}
```

### Collection `oauth.accesstoken`

```javascript
{
  _id: ObjectID,
  access_token: OauthToken,
  client_id: String,
  user_id: ObjectID,
  expires: Date,
}
```

### Collection `oauth.refreshtoken`

```javascript
{
  _id: ObjectID,
  refreshtoken: OauthToken,
  client_id: String,
  user_id: ObjectID,
  expires: Date,
}
```
