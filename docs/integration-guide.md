# Venalabs Stellar SDK - Integration Guide

This guide will help you integrate the Venalabs Stellar SDK into your website to display Stellar courses to your users.

## Prerequisites

Before you begin, make sure you have:

1. An Airdroped B2B account with SDK access
2. Your **API Key** and **Secret Key** from the Airdroped dashboard
3. Your **Organization ID** from the dashboard
4. A React 18+ application

## Step 1: Install the SDK

```bash
npm install @venalabs/stellar-sdk
# or
yarn add @venalabs/stellar-sdk
```

## Step 2: Generate User Tokens (Backend)

The SDK requires a JWT token to identify users. This token must be generated on your backend for security reasons.

### Token Requirements

- Algorithm: HS256
- Signed with: Your Secret Key (from dashboard)
- Max validity: 24 hours

### Required Claims

| Claim | Type | Description |
|-------|------|-------------|
| `sub` | string | Unique user ID in your system |
| `orgId` | string | Your organization ID |
| `iat` | number | Issued at timestamp |
| `exp` | number | Expiration timestamp |

### Example: Node.js/Express Backend

```javascript
// routes/venalabs.js
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const VENALABS_SECRET_KEY = process.env.VENALABS_SECRET_KEY;
const VENALABS_ORG_ID = process.env.VENALABS_ORG_ID;

router.get('/token', (req, res) => {
  // Ensure user is authenticated in your system
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = jwt.sign(
    {
      sub: req.user.id,
      orgId: VENALABS_ORG_ID
    },
    VENALABS_SECRET_KEY,
    { expiresIn: '24h' }
  );

  res.json({ token });
});

module.exports = router;
```

### Example: PHP/Laravel Backend

```php
// routes/api.php
use Firebase\JWT\JWT;

Route::middleware('auth')->get('/venalabs/token', function (Request $request) {
    $payload = [
        'sub' => $request->user()->id,
        'orgId' => config('services.venalabs.org_id'),
        'iat' => time(),
        'exp' => time() + 86400
    ];

    $token = JWT::encode(
        $payload,
        config('services.venalabs.secret_key'),
        'HS256'
    );

    return response()->json(['token' => $token]);
});
```

### Example: Python/Django Backend

```python
# views.py
import jwt
from datetime import datetime, timedelta
from django.conf import settings
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required

@login_required
def venalabs_token(request):
    payload = {
        'sub': str(request.user.id),
        'orgId': settings.VENALABS_ORG_ID,
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(hours=24)
    }

    token = jwt.encode(
        payload,
        settings.VENALABS_SECRET_KEY,
        algorithm='HS256'
    )

    return JsonResponse({'token': token})
```

## Step 3: Integrate the SDK (Frontend)

### Basic Integration

```tsx
import { useEffect, useState } from 'react';
import VenalabsStellarSDK from '@venalabs/stellar-sdk';
import '@venalabs/stellar-sdk/style.css';

function CoursesPage() {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchToken() {
      try {
        const response = await fetch('/api/venalabs/token', {
          credentials: 'include' // Important for cookies/session
        });

        if (!response.ok) {
          throw new Error('Failed to get token');
        }

        const data = await response.json();
        setUserToken(data.token);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchToken();
  }, []);

  if (loading) return <div>Loading courses...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!userToken) return <div>Unable to load courses</div>;

  return (
    <VenalabsStellarSDK
      apiKey={process.env.NEXT_PUBLIC_VENALABS_API_KEY}
      userToken={userToken}
      lang="en"
      stellarNetwork="PUBLIC"
    />
  );
}

export default CoursesPage;
```

### Next.js App Router Integration

```tsx
// app/courses/page.tsx
import { cookies } from 'next/headers';
import { CoursesClient } from './CoursesClient';

async function getVenalabsToken() {
  // Server-side token generation
  const jwt = require('jsonwebtoken');
  const userId = cookies().get('userId')?.value;

  if (!userId) return null;

  return jwt.sign(
    { sub: userId, orgId: process.env.VENALABS_ORG_ID },
    process.env.VENALABS_SECRET_KEY,
    { expiresIn: '24h' }
  );
}

export default async function CoursesPage() {
  const token = await getVenalabsToken();

  if (!token) {
    return <div>Please log in to view courses</div>;
  }

  return <CoursesClient token={token} />;
}
```

```tsx
// app/courses/CoursesClient.tsx
'use client';

import VenalabsStellarSDK from '@venalabs/stellar-sdk';
import '@venalabs/stellar-sdk/style.css';

export function CoursesClient({ token }: { token: string }) {
  return (
    <VenalabsStellarSDK
      apiKey={process.env.NEXT_PUBLIC_VENALABS_API_KEY!}
      userToken={token}
      lang="en"
    />
  );
}
```

## Step 4: Configure Your Domain

1. Log in to your Airdroped dashboard
2. Go to **SDK Settings**
3. Add your domain(s) to the allowed list:
   - `https://yourdomain.com`
   - `https://staging.yourdomain.com` (if applicable)
   - `http://localhost:3000` (for development)

## SDK Configuration Options

### Props Reference

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `apiKey` | string | Yes | - | Your API Key |
| `userToken` | string | Yes | - | JWT token for user |
| `lang` | 'fr' \| 'en' | No | 'fr' | UI language |
| `stellarNetwork` | 'TESTNET' \| 'PUBLIC' | No | 'TESTNET' | Blockchain network |
| `minHeight` | string \| number | No | 600 | Minimum container height |
| `className` | string | No | '' | Custom CSS class |
| `baseUrl` | string | No | Production | API URL (for testing) |
| `externalWalletKit` | StellarWalletsKit | No | - | Existing wallet instance |

### Using with Existing Stellar Wallet

If your app already uses `@creit.tech/stellar-wallets-kit`, you can pass your existing instance:

```tsx
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';
import VenalabsStellarSDK from '@venalabs/stellar-sdk';

function App() {
  const [walletKit, setWalletKit] = useState<StellarWalletsKit | null>(null);

  useEffect(() => {
    const kit = new StellarWalletsKit({
      network: 'PUBLIC',
      // your config
    });
    setWalletKit(kit);
  }, []);

  return (
    <VenalabsStellarSDK
      apiKey="your-api-key"
      userToken={token}
      externalWalletKit={walletKit}
    />
  );
}
```

## Styling

### Default Styles

Import the default CSS:

```tsx
import '@venalabs/stellar-sdk/style.css';
```

### Custom Styling

Add custom styles using the `className` prop and CSS variables:

```css
/* Your custom styles */
.my-courses-container {
  --venalabs-primary: #your-brand-color;
  --venalabs-background: #your-bg-color;
}
```

```tsx
<VenalabsStellarSDK
  className="my-courses-container"
  // ...other props
/>
```

## Error Handling

The SDK handles errors internally and displays user-friendly messages. Common errors:

| Error Code | Description | Solution |
|------------|-------------|----------|
| INVALID_API_KEY | API key is wrong or revoked | Check dashboard for correct key |
| INVALID_TOKEN | JWT signature invalid | Verify secret key |
| TOKEN_EXPIRED | JWT expired | Generate new token |
| RATE_LIMITED | Too many requests | Implement caching |
| NETWORK_ERROR | Connection issues | Check internet/CORS |

## Security Best Practices

1. **Never expose your Secret Key** in client-side code
2. **Always generate tokens server-side**
3. **Validate users** before generating tokens
4. **Use HTTPS** in production
5. **Set short token expiration** (max 24h)
6. **Whitelist only your production domains** in the dashboard

## Testing

### Development Environment

Use testnet for development:

```tsx
<VenalabsStellarSDK
  apiKey="your-test-api-key"
  userToken={token}
  stellarNetwork="TESTNET"
/>
```

### Production Checklist

- [ ] Switch to production API key
- [ ] Set `stellarNetwork="PUBLIC"`
- [ ] Remove localhost from allowed domains
- [ ] Test token generation with production secret
- [ ] Verify CORS settings
- [ ] Test wallet connection flow

## Support

- **Documentation**: https://docs.airdroped.io/sdk
- **GitHub Issues**: https://github.com/venalabs/venalabs-stellar-sdk/issues
- **Email**: support@airdroped.io
- **Discord**: https://discord.gg/airdroped
