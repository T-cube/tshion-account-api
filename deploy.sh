#!/usr/bin/bash
git pull
npm run compile
pm2 startOrReload pm2.json
