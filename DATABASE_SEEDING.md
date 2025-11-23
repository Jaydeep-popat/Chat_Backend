# Database Seeding Guide

This guide explains how to seed your database with sample users for development and testing purposes.

## Overview

The seeding functionality creates 10 sample users with predefined usernames, emails, and passwords that follow the required password pattern.

## Available Users

The seeding process creates the following users:

| Username | Display Name | Email | Password | Role |
|----------|--------------|-------|----------|------|
| alice_wonder | Alice Wonderland | alice@example.com | Alice123! | user |
| bob_builder | Bob The Builder | bob@example.com | Build123! | user |
| charlie_brown | Charlie Brown | charlie@example.com | Charlie123! | user |
| diana_prince | Diana Prince | diana@example.com | Wonder123! | user |
| eddie_murphy | Eddie Murphy | eddie@example.com | Comedy123! | user |
| fiona_apple | Fiona Apple | fiona@example.com | Music123! | user |
| george_washington | George Washington | george@example.com | President123! | user |
| helen_keller | Helen Keller | helen@example.com | Inspire123! | user |
| ivan_drago | Ivan Drago | ivan@example.com | Strong123! | user |
| admin_user | Admin User | admin@example.com | Admin123! | admin |

## Usage Methods

### Method 1: Command Line Scripts

#### Seed Database
```bash
npm run seed
```

#### Clear All Users (and their tokens)
```bash
npm run seed:clear
```

### Method 2: API Endpoints (Development Only)

These endpoints are only available when `NODE_ENV` is not set to "production".

#### Seed Users
```http
POST /api/dev/seed-users
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "message": "Users seeded successfully",
    "count": 10,
    "users": [
      {
        "username": "alice_wonder",
        "displayName": "Alice Wonderland", 
        "email": "alice@example.com",
        "password": "Alice123!",
        "role": "user"
      }
      // ... more users
    ]
  },
  "message": "Database seeded with sample users",
  "success": true
}
```

#### Clear Users
```http
DELETE /api/dev/clear-users
```

**Response:**
```json
{
  "statusCode": 200,
  "data": {
    "message": "Users cleared successfully",
    "deletedCount": 10
  },
  "message": "All users removed from database",
  "success": true
}
```

## Password Pattern

All passwords follow the required pattern:
- At least 8 characters long
- Contains at least one number
- Contains at least one special character (`!@#$%^&*`)
- Mixed case letters

Examples: `Alice123!`, `Build123!`, `Admin123!`

## Security Features

- ✅ Passwords are automatically hashed using bcrypt
- ✅ Refresh tokens are generated and stored
- ✅ All seeding endpoints are disabled in production
- ✅ Duplicate user prevention (won't create users that already exist)

## Environment Requirements

Make sure your `.env` file contains:
```env
MONGO_DB_URI=mongodb://localhost:27017
NODE_ENV=development
JWT_ACCESS_TOKEN_SECRET=your_access_token_secret
JWT_REFRESH_TOKEN_SECRET=your_refresh_token_secret
```

## Troubleshooting

### "Database already has X users" Message
If you see this message, the seeding process detected existing users. To re-seed:

1. Clear existing users first:
   ```bash
   npm run seed:clear
   ```

2. Then seed again:
   ```bash
   npm run seed
   ```

### Environment Variable Errors
Make sure your `.env` file is properly configured with `MONGO_DB_URI`.

### API Endpoints Not Working
Ensure `NODE_ENV` is not set to "production" when using the API endpoints.

## Example Usage for Testing

1. **Clear and Seed:**
   ```bash
   npm run seed:clear && npm run seed
   ```

2. **Login with Sample User:**
   ```javascript
   // Frontend login
   {
     "username": "alice_wonder",  // or use email: "alice@example.com"
     "password": "Alice123!"
   }
   ```

3. **Admin User Access:**
   ```javascript
   // Use admin user for admin functionality testing
   {
     "username": "admin_user",
     "password": "Admin123!"
   }
   ```

## Notes

- The seeding process is idempotent (safe to run multiple times)
- Users are created with `isOnline: false` by default
- All users get access and refresh tokens generated
- The admin user has elevated privileges for testing admin features

## Login Credentials for Development

Since the users are already registered in the database, you can use these credentials to login:

### Regular Users
- **Alice**: `alice_wonder` / `Alice123!`
- **Bob**: `bob_builder` / `Build123!`
- **Charlie**: `charlie_brown` / `Charlie123!`
- **Diana**: `diana_prince` / `Wonder123!`
- **Eddie**: `eddie_murphy` / `Comedy123!`
- **Fiona**: `fiona_apple` / `Music123!`
- **George**: `george_washington` / `President123!`
- **Helen**: `helen_keller` / `Inspire123!`
- **Ivan**: `ivan_drago` / `Strong123!`

### Admin User
- **Admin**: `admin_user` / `Admin123!`

You can login using either the username or email address with the corresponding password.
