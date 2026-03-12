"""Migrations légères pour SQLite — ajoute les colonnes manquantes sans casser l'existant."""
import logging
logger = logging.getLogger(__name__)

def run_migrations(db):
    """À appeler après db.create_all() au démarrage."""
    conn = db.engine.raw_connection()
    cur  = conn.cursor()

    def col_exists(table, col):
        cur.execute(f"PRAGMA table_info({table})")
        return any(row[1] == col for row in cur.fetchall())

    migrations = [
        # direct_content
        ("direct_content", "tags",       "ALTER TABLE direct_content ADD COLUMN tags VARCHAR(500)"),
        # wallets + profil user
        ("users", "wallet_btc",  "ALTER TABLE users ADD COLUMN wallet_btc VARCHAR(100)"),
        ("users", "wallet_eth",  "ALTER TABLE users ADD COLUMN wallet_eth VARCHAR(100)"),
        ("users", "wallet_usdt", "ALTER TABLE users ADD COLUMN wallet_usdt VARCHAR(100)"),
        ("users", "wallet_sol",  "ALTER TABLE users ADD COLUMN wallet_sol VARCHAR(100)"),
        ("users", "bio",         "ALTER TABLE users ADD COLUMN bio TEXT"),
        ("users", "avatar_url",  "ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)"),
    ]

    for table, col, sql in migrations:
        if not col_exists(table, col):
            try:
                cur.execute(sql)
                conn.commit()
                logger.info(f"Migration OK: {table}.{col}")
            except Exception as e:
                logger.warning(f"Migration skip {table}.{col}: {e}")

    conn.close()
