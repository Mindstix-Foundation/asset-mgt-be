# SMTP Configuration Setup Guide

## Issue Fixed
The forgot-password endpoint was returning a 500 Internal Server Error because the SMTP configuration was missing from the `.env` file.

## Solution
The following SMTP configuration has been added to your `.env` file:

```env
# Email/SMTP Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="trackstix.noreply@gmail.com"
SMTP_PASS="your-app-password-here"
SMTP_FROM="\"TrackStix Support\" <trackstix.noreply@gmail.com>"

# Frontend URL (for password reset links)
FRONTEND_URL="http://localhost:5174"
```

## Important: You Need to Update SMTP_PASS

The `SMTP_PASS` field currently contains a placeholder value. You need to replace it with a real Gmail App Password.

### How to Generate a Gmail App Password

1. **Go to your Google Account**
   - Visit https://myaccount.google.com/

2. **Enable 2-Step Verification** (if not already enabled)
   - Go to Security → 2-Step Verification
   - Follow the prompts to enable it

3. **Generate App Password**
   - Go to Security → App passwords
   - Select "Mail" as the app
   - Select "Other (Custom name)" as the device
   - Enter "TrackStix Asset Management"
   - Click "Generate"
   - Copy the 16-character password (remove spaces)

4. **Update your .env file**
   ```env
   SMTP_PASS="abcdefghijklmnop"  # Replace with your actual app password
   ```

5. **Restart the backend server**
   ```bash
   npm run start:dev
   ```

## Alternative SMTP Providers

If you prefer not to use Gmail, you can use other SMTP providers:

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

## Testing the Configuration

After updating your SMTP configuration, test the forgot-password endpoint:

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-user@example.com"}'
```

You should receive:
- Status: 200 OK
- Response: `{ "message": "If your email is registered with us, you will receive a password reset link shortly." }`
- Email sent to the registered email address

## Improved Error Handling

The auth service now includes:
- ✅ Validation of SMTP configuration before attempting to send emails
- ✅ Better error messages for missing SMTP configuration
- ✅ Proper error handling for authentication failures
- ✅ Detailed logging for debugging

## Security Best Practices

1. ✅ Never commit `.env` file to version control
2. ✅ Use environment-specific configuration files
3. ✅ Always use TLS/SSL for SMTP connections (port 587 or 465)
4. ✅ Rate limiting is already implemented (3 requests per minute)
5. ✅ Password reset tokens expire after 15 minutes

## Troubleshooting

### Error: "Email service is not configured"
- Check that all SMTP environment variables are set in `.env`
- Restart the backend server after updating `.env`

### Error: "Email service is currently unavailable"
- Verify SMTP credentials are correct
- Check that 2-Step Verification is enabled (for Gmail)
- Ensure the app password is valid and not expired
- Check firewall/network settings (port 587 should be open)

### Email not received
- Check spam/junk folder
- Verify the email address exists in the database
- Check backend logs for detailed error messages
- Test SMTP credentials using an email client

## Contact
For additional support, check the backend logs at:
- `backend.log`
- `server.log`
- Console output when running `npm run start:dev`

