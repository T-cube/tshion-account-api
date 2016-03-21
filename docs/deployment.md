# 服务器环境部署
* #### 安装nodejs
* #### 安装mongodb
* #### 安装nginx
* #### 工具安装


***
### 用nvm安装nodejs
1. [github地址]: https://github.com/creationix/nvm
2. 在root用户下输入此命令：
    ```
    curl -o-https://raw.githubusercontent.com/creationix/nvm/v0.31.0/install.sh | bash
    ```
3. nvm安装完在命令行输入
    ```
    source ~/.bash_profile
    ```
添加环境变量

4. 以上完成后就可以使用NVM工具了。
5. 在命令行输入：
    ```
    nvm list-remote
    ```
可以列出nodejs所有版本

6. 安装相应版本：
    ```
       nvm install v5.9.0
    ```
7. 查看已安装版本
    ```
    nvm list
    ```
8. 切换版本
    ```
    nvm usr v5.9.0
    ```
9. 设置默认版本
    ```
    nvm alias default v5.9.0
    ```
***
### 安装mongodb
1. [参考官网]： https://docs.mongodb.org/manual/tutorial/install-mongodb-on-red-hat/
2. 修改yum的包管理系统:
  	```
    vim /etc/yum.repos.d/mongodb-org-3.2.repo
    ```
3. 填写配置信息：
    ```
    	[mongodb-org-3.2]name=MongoDB Repository
    	baseurl=https://repo.mongodb.org/yum/redhat/$releasever/mongodb-org/3.2/x86_64/gpg
    	check=0
    	enabled=1
    ```  
4. 安装mongodb:
  	```
    yum install -y mongodb-org
    ```
5. 配置mongodb:
    ```
    cd /        //切换到根目录
    mkdr -p data/mongodb/db  data/mongodb/log  //创建数据存储目录db和日志目录log
    ```
6. 修改指定启动数据库路径和日志输出路径：
    ```
    ./bin/mongod --port 27017 --fork --logpath /data/mongodb/log/mongodb.log  --dbpath /data/mongodb/db/
    ```
    > * --dbpath：指定数据目录，默认是/data/db/。每个mongod进程都需要独立的目录，启动mongod时就会在数据目录中创建mongod.lock文件，防止其他mongod进程使用该数据目录。
    > * --port：指定服务器监听的端口，默认是27017。
    > * --fork：以守护进程的方式运行MongoDB。
    > * --logpath：指定日志输出路径，如果不指定则会在终端输出。每次启动都会覆盖原来的日志，如果不想覆盖就要用--logappend选项。
7. 备份和恢复：
    ```
    备份：mongodump  -d dbname -o dbdirectory
    ```
    ```
    恢复：mongorestore -d dbname ./dbname/
    ```
8. 设置为开机启动：
    ```
     systemctl start mongod
    ```
***
### nginx 安装与配置

1. [参考官网]： https://www.nginx.com/resources/wiki/start/topics/tutorials/install/#
2. 要添加NGINX yum软件库，创建一个名为 ```/etc/yum.repos.d/nginx.repo``` 文件，并粘贴如下配置
    ```
      [nginx]
      name=nginx repo
      baseurl=http://nginx.org/packages/centos/$releasever/$basearch/
      gpgcheck=0
      enabled=1
    ```
3. 输入： ```yum install nginx``` 等待安装完毕


### 工具安装
* ##### openssh 安装与设置
  >   ```
  yum install openssh
  cd ~  //切换到 root 用户目录
  mkdir .ssh // 新建.ssh目录
  touch authorized_keys // 在.ssh目录新建authorized_keys文件
  cat id_rsa.pub >> ~/.ssh/authorized_keys //把要登录机器的id_rsa.pub添加到 authorized_keys ；上天无痛苦只需这一步
  ```
* ##### git、unzip、wget 安装
  ```
  yum install  unzip //用于解压zip文件
  yum install  wget  //用于下载网络文件
  yum install git //等待安装完毕 你又多了个上天工具
  ```
