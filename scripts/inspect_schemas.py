import os, sqlite3

base = os.path.expanduser('~')
sample_bots = [
    'apex_kamacross_bfperps_26',
    'apex_hatrend_bfperps_28',
    'apex_breakout_hlperps_1',
    'apex_emacross_bfperps_9',
    'apex_ichimoku_bfperps_25',
]

for name in sample_bots:
    d = os.path.join(base, name, 'db')
    if not os.path.isdir(d):
        print(f'\n=== {name}: no db dir ==='); continue
    dbs = sorted([f for f in os.listdir(d) if f.endswith('.db') and '.bak' not in f])
    if not dbs:
        print(f'\n=== {name}: no db files ==='); continue
    dbfile = os.path.join(d, dbs[0])
    print(f'\n=== {name} / {dbs[0]} ===')
    conn = sqlite3.connect(dbfile)
    tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    print(f'Tables: {[t[0] for t in tables]}')
    for tname in ['trades', 'signals', 'paper_state', 'backtest_results']:
        try:
            cols = conn.execute(f'PRAGMA table_info({tname})').fetchall()
            if cols:
                print(f'  {tname}: {[c[1] for c in cols]}')
                count = conn.execute(f'SELECT COUNT(*) FROM {tname}').fetchone()[0]
                print(f'  {tname}: {count} rows')
        except:
            pass
    conn.close()
