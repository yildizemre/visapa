#!/usr/bin/env python3
"""Her saat cron ile calistirilir: dead service check + Telegram bildirim."""
import sys, os
sys.path.insert(0, '/var/www/vislivis/backend')

# .env yukle
env_path = '/var/www/vislivis/backend/.env'
if os.path.exists(env_path):
    for line in open(env_path):
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip())

from app import create_app
app = create_app()

with app.app_context():
    from routes.health import run_dead_service_check
    result = run_dead_service_check()
    dead = result.get('dead_count', 0)
    alive = result.get('alive_count', 0)
    sent = result.get('alerts_sent', False)
    print("[HealthCron] dead=%d alive=%d sent=%s" % (dead, alive, sent))
