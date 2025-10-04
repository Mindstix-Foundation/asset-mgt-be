# Email Configuration Guide

## Required Environment Variables

Add the following environment variables to your `.env` file:

```env
# Email/SMTP Configuration
SMTP_HOST="smtp.gmail.com"          # Your SMTP server host
SMTP_PORT=587                        # SMTP port (587 for TLS, 465 for SSL)
SMTP_USER="your-email@gmail.com"    # Your email account
SMTP_PASS="your-app-password"       # Your email password or app-specific password
SMTP_FROM='"TrackStix Support" <noreply@trackstix.com>'  # From email address

# Frontend URL (for password reset links)
FRONTEND_URL="http://localhost:5173"  # Your frontend URL
```

## Gmail Configuration (Recommended for Development)

If using Gmail, you need to create an **App Password**:

1. Go to your Google Account settings
2. Navigate to Security > 2-Step Verification (enable if not already)
3. Go to Security > App passwords
4. Select "Mail" and "Other (Custom name)"
5. Enter "TrackStix Asset Management"
6. Click "Generate"
7. Copy the 16-character password and use it as `SMTP_PASS`

**Example Gmail Configuration:**
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="yourcompany@gmail.com"
SMTP_PASS="abcd efgh ijkl mnop"
SMTP_FROM='"TrackStix Support" <noreply@yourcompany.com>'
FRONTEND_URL="http://localhost:5173"
```

## Other SMTP Providers

### SendGrid
```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
```

### Mailgun
```env
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT=587
SMTP_USER="postmaster@your-domain.mailgun.org"
SMTP_PASS="your-mailgun-password"
```

### AWS SES
```env
SMTP_HOST="email-smtp.us-east-1.amazonaws.com"
SMTP_PORT=587
SMTP_USER="your-aws-smtp-username"
SMTP_PASS="your-aws-smtp-password"
```

## Testing Email Functionality

After configuration, you can test the forgot password feature:

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

## Production Considerations

1. **Use Environment Variables**: Never commit credentials to version control
2. **Use TLS/SSL**: Always use encrypted connections (port 587 or 465)
3. **Rate Limiting**: The forgot-password endpoint is limited to 3 requests per minute
4. **Email Templates**: Customize the HTML email template in `auth.service.ts`
5. **Domain Authentication**: Set up SPF, DKIM, and DMARC records for your domain
6. **Monitor**: Track email delivery rates and bounce rates

## Troubleshooting

- **Authentication Failed**: Check SMTP credentials
- **Connection Timeout**: Verify SMTP_HOST and SMTP_PORT
- **Email Not Received**: Check spam folder, verify email exists
- **Port Blocked**: Some ISPs block port 25, use 587 or 465 instead

