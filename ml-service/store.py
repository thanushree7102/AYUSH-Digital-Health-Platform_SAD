"""Prediction history. MySQL when DB_HOST is set (Docker/Kubernetes); a local SQLite file otherwise (plain dev run)."""
import os, json, time, sqlite3

DB_HOST = os.environ.get("DB_HOST")

class Store:
    def __init__(self):
        if DB_HOST:
            import pymysql
            self.kind = "mysql"
            self._pymysql = pymysql
            self._wait_and_init()
        else:
            self.kind = "sqlite"
            self.path = os.environ.get("SQLITE_FILE", "predictions.db")
            with sqlite3.connect(self.path) as c:
                c.execute("CREATE TABLE IF NOT EXISTS predictions (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT, label TEXT, confidence REAL, answers TEXT)")

    def _mysql(self):
        return self._pymysql.connect(host=DB_HOST, port=int(os.environ.get("DB_PORT", 3306)), user=os.environ.get("DB_USER", "ayush"),
                                     password=os.environ.get("DB_PASSWORD", ""), database=os.environ.get("DB_NAME", "ayush_ml"),
                                     autocommit=True, cursorclass=self._pymysql.cursors.DictCursor)

    def _wait_and_init(self):  # the DB container may still be starting
        for i in range(30):
            try:
                with self._mysql() as c, c.cursor() as cur:
                    cur.execute("CREATE TABLE IF NOT EXISTS predictions (id INT AUTO_INCREMENT PRIMARY KEY, created_at DATETIME, label VARCHAR(40), confidence DOUBLE, answers TEXT)")
                return
            except Exception as e:  # noqa
                print(f"waiting for database ({i + 1}/30): {e}", flush=True); time.sleep(2)
        raise RuntimeError("database not reachable")

    def add(self, label, confidence, answers):
        ts = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime())
        if self.kind == "mysql":
            with self._mysql() as c, c.cursor() as cur:
                cur.execute("INSERT INTO predictions (created_at,label,confidence,answers) VALUES (%s,%s,%s,%s)", (ts, label, confidence, json.dumps(answers)))
        else:
            with sqlite3.connect(self.path) as c:
                c.execute("INSERT INTO predictions (created_at,label,confidence,answers) VALUES (?,?,?,?)", (ts, label, confidence, json.dumps(answers)))

    def recent(self, n=20):
        if self.kind == "mysql":
            with self._mysql() as c, c.cursor() as cur:
                cur.execute("SELECT id,created_at,label,confidence FROM predictions ORDER BY id DESC LIMIT %s", (n,))
                rows = cur.fetchall()
            return [{**r, "created_at": str(r["created_at"])} for r in rows]
        with sqlite3.connect(self.path) as c:
            c.row_factory = sqlite3.Row
            return [dict(r) for r in c.execute("SELECT id,created_at,label,confidence FROM predictions ORDER BY id DESC LIMIT ?", (n,))]

    def ping(self):
        if self.kind == "mysql":
            with self._mysql() as c, c.cursor() as cur:
                cur.execute("SELECT 1")
        return True
