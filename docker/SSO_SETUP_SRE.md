# Google SSO — assets.sre.mindstix.com

We need a Google OAuth **Web client**. Please share:

1. **Client ID**
2. **Client Secret**

---

## Steps to create the OAuth client

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. **Create credentials** → **OAuth client ID**.
3. Application type: **Web application**.
4. Name: e.g. `SRE Asset Tracker`.
5. **Authorized JavaScript origins** — add:

   ```text
   https://assets.sre.mindstix.com
   ```

6. **Authorized redirect URIs** — add:

   ```text
   https://assets.sre.mindstix.com/api/auth/google/callback
   ```

7. Click **Create** and copy **Client ID** and **Client Secret**.

---

## Restrict to Internal users only (Mindstix Workspace)

1. Go to **APIs & Services** → **OAuth consent screen**.
2. Set **User type** to **Internal**.
3. Save.

Only `@mindstix.com` Workspace accounts will be able to sign in.
