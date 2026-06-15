#!/bin/bash
set -e
cd /var/www/vislivis

echo '[deploy] DB backup...'
DB_PATH=backend/instance/vislivis.db
BAK_PATH=backend/instance/vislivis.db.deploy_bak
cp $DB_PATH $BAK_PATH 2>/dev/null || true

echo '[deploy] Git pull...'
git fetch origin
git reset --hard origin/master

echo '[deploy] DB koru - git reset uzerine yaz...'
if [ -f $BAK_PATH ]; then
  cp $BAK_PATH $DB_PATH
  echo '[deploy] DB korundu OK'
fi

echo '[deploy] Python deps...'
./venv/bin/pip install -r backend/requirements.txt -q

echo '[deploy] Node deps...'
npm install --legacy-peer-deps --silent

echo '[deploy] Frontend build...'
npm run build

echo '[deploy] Restart service...'
systemctl restart vislivis.service

echo '[deploy] Nginx reload...'
systemctl reload nginx

echo '[deploy] Done!'
