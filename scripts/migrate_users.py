import psycopg2

conn = psycopg2.connect("postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require")
cur = conn.cursor()

# Check current columns
cur.execute("""SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position""")
cols = [r[0] for r in cur.fetchall()]
print(f"Current columns ({len(cols)}):", cols)

# Add missing fields
alter_statements = []
if "avatar" not in cols:
    alter_statements.append("ALTER TABLE users ADD COLUMN avatar TEXT")
if "gender" not in cols:
    alter_statements.append("ALTER TABLE users ADD COLUMN gender VARCHAR(10)")
if "occupation" not in cols:
    alter_statements.append("ALTER TABLE users ADD COLUMN occupation VARCHAR(50)")
if "hobbies" not in cols:
    alter_statements.append("ALTER TABLE users ADD COLUMN hobbies TEXT[]")

for sql in alter_statements:
    print(f"Executing: {sql}")
    cur.execute(sql)
    print("  -> OK")

if not alter_statements:
    print("All columns already exist, no migration needed.")

# Verify
cur.execute("""SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position""")
cols = [r[0] for r in cur.fetchall()]
print(f"\nUpdated columns ({len(cols)}):", cols)

conn.commit()
cur.close()
conn.close()
print("\nDone!")
