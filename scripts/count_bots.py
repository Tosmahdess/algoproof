import os, sqlite3
base = os.path.expanduser('~')
for name in sorted(os.listdir(base)):
    if not name.startswith('apex_'): continue
    d = os.path.join(base, name, 'db')
    if not os.path.isdir(d):
        print(f'{name}|no-db'); continue
    dbs = sorted([f for f in os.listdir(d) if f.endswith('.db') and '.bak' not in f])
    if not dbs:
        print(f'{name}|no-db'); continue
    try:
        conn = sqlite3.connect(os.path.join(d, dbs[0]))
        n = conn.execute("SELECT COUNT(*) FROM trades WHERE status='closed' AND pnl IS NOT NULL").fetchone()[0]
        bal_row = conn.execute("SELECT balance FROM paper_state ORDER BY id DESC LIMIT 1").fetchone()
        bal = round(bal_row[0], 2) if bal_row else '?'
        print(f'{name}|trades={n}|balance={bal}')
        conn.close()
    except Exception as e:
        print(f'{name}|err:{e}')
