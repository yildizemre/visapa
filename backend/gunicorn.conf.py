# Gunicorn config - VDS / production
# Backend klasöründen çalıştırın: gunicorn -c gunicorn.conf.py app:app
bind = "127.0.0.1:5000"
workers = 2
threads = 2
timeout = 120
worker_class = "sync"
