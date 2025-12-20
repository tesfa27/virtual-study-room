---
description: Complete guide to using pgAdmin for database management
---

# pgAdmin Complete User Guide

This guide shows you how to perform common database management tasks using pgAdmin.

## 🚀 Getting Started

### 1. Start pgAdmin
```bash
docker-compose up -d pgadmin
```

### 2. Access pgAdmin
- Open your browser and navigate to: **http://localhost:5050**
- Login with:
  - **Email:** `admin@admin.com`
  - **Password:** `admin`

### 3. Register Your Database Server (First Time Only)
1. Right-click on **"Servers"** in the left sidebar
2. Select **"Register" → "Server"**
3. Fill in the details:

**General Tab:**
- **Name:** `Virtual Study Room DB`

**Connection Tab:**
- **Host name/address:** `db`
- **Port:** `5432`
- **Maintenance database:** Your `DB_NAME` from `.env`
- **Username:** Your `DB_USER` from `.env`
- **Password:** Your `DB_PASSWORD` from `.env`
- ✅ Check **"Save password"** (optional, for convenience)

4. Click **Save**

---

## 📊 1. Browse All Your Database Tables

### Method 1: Using the Object Explorer
1. In the left sidebar, expand:
   ```
   Servers → Virtual Study Room DB → Databases → [your_db_name] → Schemas → public → Tables
   ```
2. You'll see a list of all your tables
3. Click on any table name to see its properties

### Method 2: View Table Structure
1. Right-click on a table (e.g., `rooms_room`)
2. Select **"Properties"**
3. Navigate through tabs:
   - **Columns:** See all fields and their data types
   - **Constraints:** View primary keys, foreign keys, unique constraints
   - **Indexes:** See database indexes
   - **Triggers:** View any triggers on the table

### Method 3: Quick View Data
1. Right-click on a table
2. Select **"View/Edit Data" → "All Rows"**
3. You'll see all the data in a spreadsheet-like interface

---

## 🔍 2. Run SQL Queries

### Method 1: Query Tool
1. Right-click on your database name in the sidebar
2. Select **"Query Tool"** (or press `Alt + Shift + Q`)
3. Type your SQL query in the editor:
   ```sql
   -- Example: Get all rooms
   SELECT * FROM rooms_room;
   
   -- Example: Get rooms with user count
   SELECT r.*, COUNT(u.id) as user_count
   FROM rooms_room r
   LEFT JOIN rooms_room_users ru ON r.id = ru.room_id
   LEFT JOIN auth_user u ON ru.user_id = u.id
   GROUP BY r.id;
   
   -- Example: Find active users
   SELECT username, email, date_joined
   FROM auth_user
   WHERE is_active = true
   ORDER BY date_joined DESC;
   ```
4. Click the **▶ Execute/Refresh** button (or press `F5`)
5. View results in the **Data Output** tab below

### Method 2: Explain Query Performance
1. Write your query in the Query Tool
2. Click **Explain** button (or press `F7`)
3. View the query execution plan to optimize performance

### Method 3: Save Queries
1. Write your query
2. Click **File → Save** (or `Ctrl + S`)
3. Give it a name and save for later use

---

## ✏️ 3. View and Edit Data

### View Data
1. Navigate to the table in the sidebar
2. Right-click → **"View/Edit Data"**
3. Choose:
   - **All Rows:** View all data
   - **First 100 Rows:** Quick preview
   - **Last 100 Rows:** See recent entries
   - **Filtered Rows:** Add custom WHERE clause

### Edit Data Directly
1. Open the data view (as above)
2. **Add a new row:**
   - Click the **➕ Add Row** button in the toolbar
   - Fill in the values in the new row
   - Click **💾 Save Data Changes** (or press `F6`)

3. **Edit existing data:**
   - Click on any cell to edit
   - Make your changes
   - Click **💾 Save Data Changes**

4. **Delete a row:**
   - Click the row number to select the entire row
   - Click the **🗑️ Delete Row** button
   - Click **💾 Save Data Changes**

### Bulk Edit with SQL
```sql
-- Update multiple records
UPDATE rooms_room
SET is_active = true
WHERE created_at > '2025-01-01';

-- Delete old records
DELETE FROM rooms_message
WHERE created_at < '2024-01-01';
```

---

## 📈 4. Monitor Database Performance

### Method 1: Dashboard
1. Click on your database name in the sidebar
2. Select the **"Dashboard"** tab
3. View real-time statistics:
   - Database size
   - Number of connections
   - Transaction rate
   - Tuples (rows) inserted/updated/deleted

### Method 2: Server Activity
1. Right-click on your server name
2. Select **"Server Activity"**
3. View:
   - **Sessions:** Active database connections
   - **Locks:** Current locks on tables
   - **Prepared Transactions:** Pending transactions

### Method 3: Query Statistics
1. Go to **Tools → Server Status**
2. View:
   - Active queries
   - Long-running queries
   - Blocked queries

### Method 4: Analyze Table Performance
```sql
-- Get table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Find slow queries (if pg_stat_statements is enabled)
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

---

## 💾 5. Create Backups

### Method 1: Backup Entire Database (GUI)
1. Right-click on your database name
2. Select **"Backup..."**
3. Configure backup settings:
   - **Filename:** Choose location and name (e.g., `backup_2025-12-19.sql`)
   - **Format:** 
     - **Plain:** SQL text file (human-readable)
     - **Custom:** Compressed binary format (recommended)
     - **Tar:** Tar archive
     - **Directory:** Directory of files
   - **Encoding:** UTF8
   - **Role name:** Your database user
4. Go to **"Data Options"** tab:
   - ✅ Check **"Data"** to include data
   - ✅ Check **"Blobs"** if you have binary data
5. Click **"Backup"**
6. Monitor progress in the bottom panel

### Method 2: Backup Specific Tables
1. Navigate to **Schemas → public → Tables**
2. Right-click on a specific table
3. Select **"Backup..."**
4. Follow the same steps as above

### Method 3: Backup via Command Line (in Docker)
```bash
# Backup entire database
docker-compose exec db pg_dump -U your_db_user your_db_name > backup.sql

# Backup with compression
docker-compose exec db pg_dump -U your_db_user -Fc your_db_name > backup.dump

# Backup specific table
docker-compose exec db pg_dump -U your_db_user -t rooms_room your_db_name > rooms_backup.sql
```

### Method 4: Automated Backup Script
Create a file `backup-db.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

docker-compose exec -T db pg_dump -U $DB_USER -Fc $DB_NAME > "$BACKUP_DIR/backup_$DATE.dump"
echo "Backup created: $BACKUP_DIR/backup_$DATE.dump"

# Keep only last 7 backups
ls -t $BACKUP_DIR/backup_*.dump | tail -n +8 | xargs rm -f
```

---

## 🔄 6. Restore from Backup

### Method 1: Restore via GUI
1. Right-click on your database name
2. Select **"Restore..."**
3. Configure:
   - **Filename:** Browse to your backup file
   - **Format:** Match your backup format
   - **Role name:** Your database user
4. Go to **"Data Options"** tab:
   - ✅ Check **"Clean before restore"** (drops existing objects)
5. Click **"Restore"**

### Method 2: Restore via Command Line
```bash
# Restore from plain SQL file
docker-compose exec -T db psql -U your_db_user your_db_name < backup.sql

# Restore from custom format
docker-compose exec db pg_restore -U your_db_user -d your_db_name backup.dump

# Restore and drop existing data first
docker-compose exec db pg_restore -U your_db_user -d your_db_name --clean backup.dump
```

---

## 👥 7. Manage Database Users and Permissions

### View Existing Users
1. Expand **Servers → Virtual Study Room DB → Login/Group Roles**
2. You'll see all database users

### Create a New User
1. Right-click on **"Login/Group Roles"**
2. Select **"Create" → "Login/Group Role..."**
3. **General Tab:**
   - **Name:** Enter username (e.g., `readonly_user`)
4. **Definition Tab:**
   - **Password:** Set a password
5. **Privileges Tab:**
   - ✅ **Can login?** (for login users)
   - ✅ **Superuser?** (only if needed)
   - ✅ **Create databases?**
   - ✅ **Create roles?**
6. Click **Save**

### Grant Permissions to a User

#### Method 1: Via GUI
1. Navigate to the table/schema you want to grant access to
2. Right-click → **"Properties"**
3. Go to **"Security"** tab
4. Click **➕** to add a new privilege
5. Select the user and check the permissions:
   - **SELECT:** Read data
   - **INSERT:** Add new rows
   - **UPDATE:** Modify existing data
   - **DELETE:** Remove rows
   - **TRUNCATE:** Empty table
   - **REFERENCES:** Create foreign keys
   - **TRIGGER:** Create triggers
6. Click **Save**

#### Method 2: Via SQL
```sql
-- Create a read-only user
CREATE USER readonly_user WITH PASSWORD 'secure_password';

-- Grant read access to all tables in public schema
GRANT CONNECT ON DATABASE your_db_name TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

-- Grant read access to future tables too
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO readonly_user;

-- Create a read-write user
CREATE USER readwrite_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE your_db_name TO readwrite_user;
GRANT USAGE ON SCHEMA public TO readwrite_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO readwrite_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO readwrite_user;

-- Revoke permissions
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM readonly_user;

-- Drop a user
DROP USER readonly_user;
```

### View User Permissions
```sql
-- See all permissions for a specific user
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE grantee = 'readonly_user';

-- See all users and their roles
SELECT 
    usename as username,
    usesuper as is_superuser,
    usecreatedb as can_create_db,
    valuntil as password_expiry
FROM pg_user;
```

---

## 🎯 Bonus: Useful Tips

### 1. Keyboard Shortcuts
- `Alt + Shift + Q`: Open Query Tool
- `F5`: Execute query
- `F7`: Explain query
- `F8`: Execute query with EXPLAIN ANALYZE
- `Ctrl + Space`: Auto-complete
- `Ctrl + S`: Save query
- `Ctrl + Shift + C`: Comment/uncomment lines

### 2. View Query History
1. In Query Tool, click **"History"** tab
2. See all previously executed queries
3. Double-click to re-run

### 3. Export Data
1. Run a query in Query Tool
2. Click **"Download as CSV"** button (💾 icon)
3. Choose delimiter and options
4. Save the file

### 4. Import CSV Data
1. Right-click on a table
2. Select **"Import/Export Data..."**
3. Choose your CSV file
4. Map columns
5. Click **Import**

### 5. Create Indexes for Performance
```sql
-- Create index on frequently queried column
CREATE INDEX idx_room_name ON rooms_room(name);

-- Create composite index
CREATE INDEX idx_room_user ON rooms_room_users(room_id, user_id);

-- Create unique index
CREATE UNIQUE INDEX idx_user_email ON auth_user(email);
```

### 6. Monitor Connection Count
```sql
-- See current connections
SELECT 
    datname,
    count(*) as connections
FROM pg_stat_activity
GROUP BY datname;

-- Kill a specific connection
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE pid = 12345;  -- Replace with actual PID
```

---

## 🔧 Troubleshooting

### Can't connect to database?
- Ensure Docker containers are running: `docker-compose ps`
- Check database credentials in `.env` file
- Verify host is set to `db` (not `localhost`)

### pgAdmin won't load?
- Check if port 5050 is available: `netstat -an | findstr 5050`
- Restart pgAdmin: `docker-compose restart pgadmin`

### Forgot pgAdmin password?
- Stop containers: `docker-compose down`
- Remove pgAdmin volume: `docker volume rm virtual-study-room_pgadmin_data`
- Start again: `docker-compose up -d pgadmin`

---

## 📚 Additional Resources

- [pgAdmin Official Documentation](https://www.pgadmin.org/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [SQL Tutorial](https://www.postgresql.org/docs/current/tutorial.html)

Happy database managing! 🎉
