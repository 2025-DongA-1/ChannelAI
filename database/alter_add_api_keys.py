import pymysql

conn = pymysql.connect(
    host='project-db-cgi.smhrd.com',
    port=3307,
    user='cgi_25K_DA1_p3_1',
    password='smhrd1',
    database='cgi_25K_DA1_p3_1',
    charset='utf8mb4'
)
cursor = conn.cursor()

# Check current columns
cursor.execute("SHOW COLUMNS FROM marketing_accounts LIKE 'api_key'")
if cursor.fetchone():
    print("api_key column already exists")
else:
    cursor.execute("ALTER TABLE marketing_accounts ADD COLUMN api_key TEXT NULL")
    print("api_key column added")

cursor.execute("SHOW COLUMNS FROM marketing_accounts LIKE 'secret_key'")
if cursor.fetchone():
    print("secret_key column already exists")
else:
    cursor.execute("ALTER TABLE marketing_accounts ADD COLUMN secret_key TEXT NULL")
    print("secret_key column added")

conn.commit()

# Verify
cursor.execute("DESCRIBE marketing_accounts")
for row in cursor.fetchall():
    print(row)

conn.close()
print("\nDone!")
