import os, glob

print("=== SUNUCU LOG DOSYALARI 16.06 ===")
log_dirs = [
    '/var/www/vislivis/logs',
    '/tmp',
    '/root',
    '/home',
]
for d in log_dirs:
    if os.path.exists(d):
        print(f"\n--- {d} ---")
        for root, dirs, files in os.walk(d):
            for f in files:
                if '2026-06-16' in f or 'api' in f.lower() or 'log' in f.lower():
                    fp = os.path.join(root, f)
                    try:
                        sz = os.path.getsize(fp)
                        print(f"  {fp} ({sz} bytes)")
                    except:
                        pass
            if root != d:
                break

print("\n=== FLASK LOG / GUNICORN ===")
for f in ['/var/log/gunicorn.log', '/var/log/gunicorn/error.log', '/var/www/vislivis/backend/app.log', '/var/www/vislivis/backend/flask.log']:
    if os.path.exists(f):
        sz = os.path.getsize(f)
        print(f"  {f} ({sz} bytes)")
        # son 20 satir
        with open(f) as fh:
            lines = fh.readlines()
        for l in lines[-20:]:
            if '19:' in l or '20:' in l or 'heatmap' in l.lower() or 'customer' in l.lower():
                print(f"    {l.rstrip()}")

print("\n=== SISTEMDEKI TUM LOG/API TXT DOSYALARI ===")
for f in glob.glob('/var/www/vislivis/**/*api*.txt', recursive=True):
    print(f"  {f}")
for f in glob.glob('/var/www/vislivis/**/*.log', recursive=True):
    sz = os.path.getsize(f)
    print(f"  {f} ({sz} bytes)")
print("TAMAM")
