# 🔒 Security Documentation - TrackStix Asset Management System

## Overview
This document outlines the security measures implemented in the TrackStix Asset Management System (Backend).

**Last Updated:** October 7, 2025  
**System Type:** Admin-Only Application  
**Security Rating:** ⭐⭐⭐⭐⭐⭐⭐⭐⚪⚪ (8/10)

---

## 🛡️ Authentication & Authorization

### Token-Based Authentication
- **Access Tokens:** JWT tokens stored in HTTP-only cookies (15-minute expiry)
- **Refresh Tokens:** Cryptographically secure tokens (7-day expiry)
- **Token Storage:** HTTP-only cookies with SameSite protection
- **Token Rotation:** Automatic refresh token rotation on use

### Cookie Security
```typescript
// Production Cookie Configuration
{
  httpOnly: true,          // Prevents JavaScript access
  secure: true,            // HTTPS only in production
  sameSite: 'strict',      // Prevents CSRF attacks
  maxAge: 15 * 60 * 1000   // 15 minutes for access token
}
```

### Password Security
- **Hashing Algorithm:** bcrypt with 10 salt rounds
- **Password Requirements:**
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (@$!%*?&)
- **Password Reset:** JWT-based tokens with 15-minute expiry
- **Single-Use Tokens:** Reset tokens can only be used once

---

## 🚨 Account Protection

### Brute Force Prevention
- **Failed Login Tracking:** Counts failed attempts per user
- **Account Lockout:** 15-minute lockout after 5 failed attempts
- **Rate Limiting:**
  - Login endpoint: 5 attempts per minute
  - Password reset: 3 attempts per minute
  - Global: Configured via @nestjs/throttler

### Session Security
- **Session Fingerprinting:** SHA-256 hash of IP + User Agent
- **Device Tracking:** Stores IP, User Agent, and Device ID
- **Session Validation:** Fingerprint verification on token refresh
- **Multi-Device Support:** Each device has separate session
- **Session Revocation:** All sessions invalidated on password change

---

## 🔐 Token Management

### Token Blacklisting
```typescript
// Automatic cleanup of expired tokens
- Runs every hour
- Removes tokens past expiration date
- Clears in-memory cache periodically
```

### Token Invalidation
- **On Logout:** Access and refresh tokens blacklisted
- **On Password Change:** All user tokens invalidated
- **On Password Reset:** All user sessions terminated
- **User Invalidation:** Special markers for bulk invalidation

---

## 🌐 Network Security

### CORS Configuration
```typescript
// Development
allowedOrigins: ['http://localhost:5173', 'http://localhost:5174']

// Production
allowedOrigins: [process.env.FRONTEND_URL]

credentials: true  // Required for cookie authentication
```

### Security Headers (Helmet.js)
```typescript
{
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  hsts: {
    maxAge: 31536000,      // 1 year
    includeSubDomains: true,
    preload: true
  }
}
```

### Request Tracking
- **Request ID:** Unique UUID for each request
- **X-Request-ID Header:** Exposed for client-side tracking
- **Browser Fingerprinting:** Client sends X-Fingerprint header

---

## 📧 Email Security

### Password Reset Flow
1. User requests password reset
2. Server validates email (constant-time to prevent enumeration)
3. JWT token generated and stored in database
4. Email sent with reset link (15-minute expiry)
5. Token validated on reset
6. All user sessions terminated after successful reset

### Timing Attack Prevention
```typescript
// Constant-time delay (minimum 1 second)
- Prevents email enumeration
- Same response time regardless of email existence
- Applied to both success and failure cases
```

---

## 🏗️ Architecture Decisions

### Admin-Only System
- All users must have at least one active role
- No guest or public access
- All endpoints protected by default
- Public routes explicitly marked with @Public() decorator

### Role-Based Access Control
```typescript
// Current Implementation (v1.0)
- Single ADMIN role for all users
- Role validation on authentication
- Future-ready for multiple roles
```

---

## 🔍 Security Monitoring

### Logging
```typescript
// Security Events Logged:
- Failed login attempts
- Account lockouts
- Password reset requests
- Token refresh operations
- Session invalidations
- Authentication errors
```

### Recommendations for Production
1. **Add Security Audit Trail**
   ```typescript
   // Track all security events
   - Login success/failure
   - Password changes
   - Session creation/termination
   - Anomalous activity
   ```

2. **Implement Anomaly Detection**
   - Login from unusual locations
   - Multiple devices in short time
   - Rapid token refresh attempts

3. **Add Session Management UI**
   - View active sessions
   - Revoke specific sessions
   - See login history

---

## 🚀 Production Deployment Checklist

### Environment Variables
```bash
# Required for production
NODE_ENV=production
JWT_SECRET=<strong-random-secret-256-bits>
DATABASE_URL=<postgresql-connection-string>
FRONTEND_URL=<your-frontend-domain>

# SMTP Configuration
SMTP_HOST=<smtp-server>
SMTP_PORT=<smtp-port>
SMTP_USER=<smtp-username>
SMTP_PASS=<smtp-password>
SMTP_FROM=<from-email>
```

### Security Hardening
- [ ] Use strong JWT_SECRET (256-bit minimum)
- [ ] Enable HTTPS in production
- [ ] Set secure cookies (secure: true)
- [ ] Configure production CORS origins
- [ ] Set up database SSL/TLS
- [ ] Enable database connection pooling
- [ ] Configure rate limiting properly
- [ ] Set up monitoring and alerting
- [ ] Regular security updates
- [ ] Automated vulnerability scanning

---

## 🐛 Known Limitations & Future Improvements

### Current Limitations
1. **No Multi-Factor Authentication (MFA)**
   - Consider: TOTP, SMS, Email codes
   
2. **Basic Session Fingerprinting**
   - Consider: More robust fingerprinting
   - Add geolocation validation

3. **No Password History**
   - Users can reuse old passwords
   - Add password history tracking (last 5 passwords)

4. **Limited Audit Logging**
   - Basic security event logging only
   - Need comprehensive audit trail

### Planned Improvements
- [ ] Add MFA/2FA support
- [ ] Implement password history
- [ ] Enhanced audit logging
- [ ] Anomaly detection system
- [ ] Session management dashboard
- [ ] IP whitelist/blacklist
- [ ] Geolocation-based access control

---

## 📚 Security Best Practices

### For Developers
1. **Never log sensitive data** (passwords, tokens, etc.)
2. **Always use parameterized queries** (Prisma handles this)
3. **Validate all user input** (ValidationPipe enabled globally)
4. **Keep dependencies updated** (`npm audit` regularly)
5. **Follow principle of least privilege**
6. **Use TypeScript for type safety**

### For Administrators
1. **Use strong passwords** for database and admin accounts
2. **Regularly rotate JWT secrets** in production
3. **Monitor failed login attempts**
4. **Review security logs** regularly
5. **Keep system updated** with security patches
6. **Backup database** regularly
7. **Test disaster recovery** procedures

---

## 📞 Security Contact

For security issues or questions:
- **Email:** security@trackstix.com
- **Response Time:** 24-48 hours for critical issues

### Reporting Security Vulnerabilities
Please report security vulnerabilities privately via email with:
1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if available)

---

## 📄 Compliance

### Data Protection
- User passwords: bcrypt hashed, never stored in plain text
- Tokens: HTTP-only cookies, not accessible via JavaScript
- Personal data: Stored securely in PostgreSQL database
- Session data: Automatically cleaned up after expiry

### OWASP Top 10 Compliance
- ✅ A01:2021 – Broken Access Control (Protected)
- ✅ A02:2021 – Cryptographic Failures (bcrypt, JWT)
- ✅ A03:2021 – Injection (Prisma ORM, parameterized queries)
- ✅ A04:2021 – Insecure Design (Secure by design)
- ✅ A05:2021 – Security Misconfiguration (Helmet, CORS)
- ✅ A06:2021 – Vulnerable Components (Regular updates)
- ✅ A07:2021 – Authentication Failures (Robust auth system)
- ✅ A08:2021 – Software and Data Integrity (Validation pipes)
- ⚠️ A09:2021 – Security Logging (Basic implementation)
- ✅ A10:2021 – Server-Side Request Forgery (Protected)

---

## 🔄 Update History

| Version | Date | Changes |
|---------|------|---------|
| 1.2.0 | 2025-10-07 | Enhanced security: token cleanup, fingerprinting, timing attack fixes |
| 1.1.0 | 2025-09-30 | Cookie-based authentication, HTTP-only tokens |
| 1.0.0 | 2025-09-15 | Initial security implementation |

---

**Note:** This document should be reviewed and updated regularly as new security features are added or vulnerabilities are discovered.

