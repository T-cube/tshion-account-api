# 服务器环境部署

使用系统是 CentOS Linux release 7.2.1511 (Core)

查看系统版本命令：`cat /etc/redhat-release`

## 目录

* [常用工具安装与防火墙配置](#常用工具安装与防火墙配置)
* [用nvm安装nodejs](#用nvm安装nodejs)
* [安装mongodb](#安装mongodb)
* [安装nginx](#安装nginx )


## 系统初始化、常用工具安装与防火墙配置

### 禁用 SELinux

参见：https://www.centos.org/docs/5/html/5.1/Deployment_Guide/sec-sel-enable-disable.html

查看 SELinux 状态
```
/usr/sbin/sestatus -v
```
修改配置文件
```
sudo vi /etc/selinux/config
```
```
#SELINUX=enforcing
SELINUX=disabled
```
重新启动以生效
```
sudo reboot
```

### openssh 安装与设置

id_rsa.pub 文件是需要访问机器的 ssh key
```
sudo yum install openssh
mkdir .ssh && cd .ssh/ #新建.ssh目录
touch authorized_keys  #在.ssh目录新建authorized_keys文件
cat id_rsa.pub >> ~/.ssh/authorized_keys #把要登录机器的id_rsa.pub添加到 authorized_keys ；上天无痛苦只需这一步
```

### git、unzip、wget 安装

```
sudo yum install -y unzip #用于解压zip文件
sudo yum install -y wget  #用于下载网络文件
sudo yum install -y git   #用于版本管理
```

### 系统安装好先安装个网络管理工具 net-tools

```
sudo yum install -y net-tools
```

### 配置防火墙

因不熟悉CentOS中的firewalld，所以换为原始的iptables

参见：https://www.digitalocean.com/community/tutorials/how-to-migrate-from-firewalld-to-iptables-on-centos-7

```
sudo systemctl disable firewalld
sudo systemctl stop firewalld

sudo yum install iptables-services
sudo systemctl enable iptables
sudo systemctl enable ip6tables

sudo systemctl start iptables
sudo systemctl start ip6tables
```

开放默认80端口，8000端口（主要用于测试），3000端口（API，生产环境部署使用nginx代理到80）
```
sudo iptables -I INPUT 5 -i enp3s0 -p tcp --dport 8000 -m state --state NEW,ESTABLISHED -j ACCEPT
sudo iptables -I INPUT 5 -i enp3s0 -p tcp --dport 80 -m state --state NEW,ESTABLISHED -j ACCEPT
sudo iptables -I INPUT 5 -i enp3s0 -p tcp --dport 3000 -m state --state NEW,ESTABLISHED -j ACCEPT
```

## 用nvm安装nodejs

[github地址]: https://github.com/creationix/nvm
在root用户下输入此命令：
```
curl -o-https://raw.githubusercontent.com/creationix/nvm/v0.31.0/install.sh | bash
```
nvm安装完需要添加环境变量，输入：
```
source ~/.bash_profile
```

查看nvm版本和nodejs版本：
```
nvm --version && nvm list-remote
```
安装相应版本：
```
nvm install v5.9.0
```
查看已安装版本
```
nvm list
```
切换版本
```
nvm use v5.9.0
```
设置默认版本
```
nvm alias default v5.9.0
```

## 安装mongodb

**参考官网**：

https://docs.mongodb.org/manual/tutorial/install-mongodb-on-red-hat/

修改yum的包管理系统:
```
vim /etc/yum.repos.d/mongodb-org-3.2.repo
```

填写配置信息：
```
[mongodb-org-3.2]name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/$releasever/mongodb-org/3.2/x86_64/gpg
check=0
enabled=1
```  

安装mongodb:
```
sudo yum install -y mongodb-org
```

配置mongodb:
```
cd /        #切换到根目录
mkdir -p data/mongodb/db data/mongodb/log  #创建数据存储目录db和日志目录log
```

修改指定启动数据库路径和日志输出路径：
```
./bin/mongod --port 27017 --fork --logpath /data/mongodb/log/mongodb.log --dbpath /data/mongodb/db/
```
* --dbpath：指定数据目录，默认是/data/db/。每个mongod进程都需要独立的目录，启动mongod时就会在数据目录中创建mongod.lock文件，防止其他mongod进程使用该数据目录。
* --port：指定服务器监听的端口，默认是27017。
* --fork：以守护进程的方式运行MongoDB。
* --logpath：指定日志输出路径，如果不指定则会在终端输出。每次启动都会覆盖原来的日志，如果不想覆盖就要用--logappend选项。

### 备份和恢复

备份：
```
mongodump -d dbname -o <dbdirectory>
```
恢复：
```
mongorestore -d dbname <dbdirectory>
```
设置为开机启动：
```
sudo systemctl start mongod
```

## 安装nginx

参考官网：
https://www.nginx.com/resources/wiki/start/topics/tutorials/install/

```
sudo vi /etc/yum.repos.d/nginx.repo
```
输入以下内容并保存
```
[nginx]
name=nginx repo
baseurl=http://nginx.org/packages/centos/$releasever/$basearch/
gpgcheck=0
enabled=1

```

```
sudo yum install -y nginx
```

## 代码部署及运行

### 代码部署

```
# 初始化
git clone https://git.coding.net/alphakevin/tlf-api.git
# 更新
git pull origin master
```

### 启动服务

#### development

开发环境启动API服务
```
cd tlf-api/
npm install
# 文件修改后自动编译
npm run watch
# 文件修改后自动重新启动
npm run nodemon
```

#### production

生产环境启动API服务

```
# 安装 pm2
sudo npm install -g pm2
# 编译
npm run compile
# 运行
pm2 start -n 'tlf-api' ./app/index.js
```
