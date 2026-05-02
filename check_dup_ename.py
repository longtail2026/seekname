#!/usr/bin/env python3
import psycopg2

NEON_URL = "postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
conn = psycopg2.connect(NEON_URL)
cur = conn.cursor()

cur.execute("SELECT english_name, COUNT(*) FROM ename_dict GROUP BY english_name HAVING COUNT(*) > 1 ORDER BY COUNT(*) DESC")
dups = cur.fetchall()
if dups:
    print(f"Found {len(dups)} duplicate english_name values:")
    for d in dups:
        print(f"  {d[0]}: {d[1]} duplicates")
else:
    print("No duplicates found in english_name - good!")

cur.close()
conn.close()