# Database Setup

This directory contains the database setup files for the Sprint Planning Demo application.

## PostgreSQL Setup

### Prerequisites

1. Install PostgreSQL on your system
2. Ensure PostgreSQL service is running
3. Have access to create databases and users

### Setup Instructions

1. **Create Database**
   ```bash
   # Connect to PostgreSQL as superuser
   psql -U postgres
   
   # Create database
   CREATE DATABASE sprint_demo;
   
   # Connect to the new database
   \c sprint_demo
   ```

2. **Run Setup Script**
   ```bash
   # From the database directory
   psql -U postgres -d sprint_demo -f setup.sql
   ```

3. **Verify Setup**
   ```bash
   # Connect to database
   psql -U postgres -d sprint_demo
   
   # Check tables
   \dt
   
   # Check demo data
   SELECT * FROM users;
   SELECT * FROM sessions;
   ```

### Environment Variables

Make sure your backend `.env` file has the correct database URL:

```
DATABASE_URL=postgresql://username:password@localhost:5432/sprint_demo
```

Replace `username` and `password` with your PostgreSQL credentials.

### Tables Created

- **users**: Stores user information (demo only)
- **sessions**: Manages user sessions
- **sprint_sessions**: Stores sprint planning sessions and responses

### Demo Data

The setup script includes demo data for testing:
- Demo user: `demo@example.com`
- Demo session with 24-hour expiration

### Troubleshooting

1. **Connection Issues**
   - Verify PostgreSQL is running
   - Check credentials in DATABASE_URL
   - Ensure database exists

2. **Permission Issues**
   - Run as PostgreSQL superuser
   - Check user permissions

3. **Extension Issues**
   - Ensure uuid-ossp extension is available
   - Run as superuser if needed 