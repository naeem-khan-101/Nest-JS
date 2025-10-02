# Authentication API Guide

This guide provides comprehensive documentation for the NestJS Authentication System with email verification via OTP.

## 🔧 Setup Instructions

### 1. Environment Configuration

Copy `.env.example` to `.env` and configure the following variables:

```bash
# Application
NODE_ENV=development
PORT=3000
CORS_ORIGIN=*

# Database Configuration (MySQL)
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USERNAME=root
DATABASE_PASSWORD=your_password
DATABASE_NAME=nestjs_starter

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# OTP Configuration
OTP_EXPIRY_MINUTES=10
OTP_RATE_LIMIT_MINUTES=1

# SMTP Configuration (Email Service)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="NestJS App" <noreply@yourapp.com>
```

### 2. Email Service Setup

#### Option 1: Gmail
1. Enable 2-factor authentication
2. Generate an App Password
3. Use `smtp.gmail.com` as SMTP_HOST

#### Option 2: Development (Console Logging)
Leave SMTP configuration empty and OTPs will be logged to the console.

### 3. Database Setup

Create the MySQL database:
```sql
CREATE DATABASE nestjs_starter;
```

The application will automatically create the required tables.

## 📚 API Endpoints

Base URL: `http://localhost:3000/api/v1`

### Authentication Endpoints

#### 1. Register User
**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "message": "Registration successful. Please check your email for verification code.",
  "email": "user@example.com"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123",
    "name": "John Doe"
  }'
```

---

#### 2. Verify Email
**POST** `/auth/verify-email`

Verify email address using the 6-digit OTP sent to the user's email.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "message": "Email verified successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": true,
    "createdAt": "2023-12-01T10:00:00.000Z",
    "updatedAt": "2023-12-01T10:05:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "otp": "123456"
  }'
```

---

#### 3. Resend OTP
**POST** `/auth/resend-otp`

Resend the verification OTP. Rate limited to 1 request per minute.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "OTP sent successfully. Please check your email."
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

---

#### 4. Login
**POST** `/auth/login`

Login with verified credentials to receive access and refresh tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": true,
    "createdAt": "2023-12-01T10:00:00.000Z",
    "updatedAt": "2023-12-01T10:05:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123"
  }'
```

---

#### 5. Refresh Token
**POST** `/auth/refresh`

Get a new access token using the refresh token.

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": true,
    "createdAt": "2023-12-01T10:00:00.000Z",
    "updatedAt": "2023-12-01T10:05:00.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "x1y2z3a4b5c6..."
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "a1b2c3d4e5f6..."
  }'
```

---

#### 6. Get Profile
**GET** `/auth/profile`

Get the current user's profile. Requires authentication.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Profile retrieved successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": true,
    "createdAt": "2023-12-01T10:00:00.000Z",
    "updatedAt": "2023-12-01T10:05:00.000Z"
  }
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

#### 7. Logout
**POST** `/auth/logout`

Logout and revoke a specific refresh token. Requires authentication.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "a1b2c3d4e5f6..."
  }'
```

---

#### 8. Logout from All Devices
**POST** `/auth/logout-all`

Revoke all refresh tokens for the current user. Requires authentication.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Logged out from all devices successfully"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout-all \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

#### 9. Get Active Sessions
**GET** `/auth/sessions`

Get all active sessions (refresh tokens) for the current user. Requires authentication.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "sessions": [
    {
      "id": 1,
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "ipAddress": "192.168.1.100",
      "createdAt": "2023-12-01T10:00:00.000Z",
      "expiresAt": "2023-12-31T10:00:00.000Z"
    }
  ]
}
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/api/v1/auth/sessions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

#### 10. Revoke Specific Session
**DELETE** `/auth/sessions/:sessionId`

Revoke a specific session by ID. Requires authentication.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Session revoked successfully"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/api/v1/auth/sessions/1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 🔒 Security Features

### Password Security
- Passwords are hashed using bcrypt with salt rounds of 12
- Strong password policy enforced at application level
- Passwords are never returned in API responses

### OTP Security
- 6-digit numeric OTPs
- Securely hashed using bcrypt before storage
- 10-minute expiry (configurable)
- Rate limiting: 1 OTP per minute per email
- Single-use: OTPs are marked as used after verification

### JWT Security
- Access tokens: Short-lived (15 minutes default)
- Refresh tokens: Long-lived (30 days default)
- Refresh token rotation: New refresh token issued on each refresh
- Refresh tokens are hashed before storage
- Session tracking with user agent and IP address

### Additional Security
- CORS configuration
- Helmet middleware for security headers
- Input validation using class-validator
- Database columns are nullable (validation at application layer)
- Global authentication guard with public route exceptions

## 🧪 Testing

### Running Tests
```bash
# Unit tests
npm run test

# Specific test file
npm run test auth.service.spec.ts

# Test coverage
npm run test:cov
```

### Test Coverage
The authentication system includes comprehensive unit tests for:
- User registration with validation
- Email verification with OTP
- Login with credential validation
- Token refresh functionality
- Error handling scenarios

## 🚀 Production Deployment

### Environment Variables for Production
1. Change `NODE_ENV` to `production`
2. Use a strong, unique `JWT_SECRET`
3. Configure proper SMTP settings
4. Use environment-specific database credentials
5. Set appropriate `CORS_ORIGIN`

### Security Checklist
- [ ] Use HTTPS in production
- [ ] Set secure CORS origins
- [ ] Use strong JWT secrets
- [ ] Configure proper database security
- [ ] Set up proper logging and monitoring
- [ ] Use rate limiting middleware
- [ ] Configure proper email service

## 📊 Error Codes

| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | Bad Request | Invalid input data or expired OTP |
| 401 | Unauthorized | Invalid credentials or expired token |
| 403 | Forbidden | Access denied |
| 404 | Not Found | User or resource not found |
| 409 | Conflict | User already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

## 🔍 Troubleshooting

### Common Issues

1. **OTP not received**
   - Check SMTP configuration
   - Verify email address is correct
   - Check spam folder
   - In development, check console logs

2. **Login fails after email verification**
   - Ensure email was properly verified
   - Check password is correct
   - Verify database connection

3. **Token refresh fails**
   - Check refresh token hasn't expired
   - Verify refresh token wasn't revoked
   - Ensure proper token format

4. **Database connection issues**
   - Verify MySQL is running
   - Check database credentials
   - Ensure database exists

### Debug Mode
Set `NODE_ENV=development` for detailed logging and console OTP output.

## 📖 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
- [Email Security Best Practices](https://www.owasp.org/index.php/Email_Security_Cheat_Sheet)