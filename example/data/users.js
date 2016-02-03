{
  "_id": ObjectId(""),
  "username": /\w+/,      // user login name (mobile phone number)
  "name": String,         // nickname
  "password": md5('password')  // md5 hash of user password
  "avatar": String,
  "contacts" [             // friends list
    {
      "user_id": ObjectId,// reference to friend users._id
      "nickname": String  // friend nickname by user
    }
  ]
  "groups": [
    ObjectId(),
    //...
  ],
  "peers": [
    ObjectId(),
    //...
  ]

}
