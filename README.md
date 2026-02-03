# @venalabs/stellar-sdk

Official React SDK for integrating Venalabs Stellar courses on your website.

## Installation

```bash
npm install @venalabs/stellar-sdk
# or
yarn add @venalabs/stellar-sdk
```

## Requirements

- React 18.0.0 or higher
- React DOM 18.0.0 or higher

## Quick Start

```tsx
import VenalabsStellarSDK from '@venalabs/stellar-sdk';
import '@venalabs/stellar-sdk/style.css';

function App() {
  const getAccessToken = async () => {
    const res = await fetch('/api/venalabs-token', { credentials: 'include' });
    const data = await res.json();
    return data.accessToken;
  };

  return (
    <VenalabsStellarSDK
      apiKey="your-api-key"
      getAccessToken={getAccessToken}
    />
  );
}
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `apiKey` | `string` | Yes | - | API Key provided by Airdroped dashboard |
| `getAccessToken` | `() => Promise<string>` | Yes | - | Async function that returns an access token (called on init and automatically on 401) |
| `lang` | `'fr' \| 'en'` | No | `'fr'` | UI language |
| `stellarNetwork` | `'TESTNET' \| 'PUBLIC'` | No | `'TESTNET'` | Stellar network for wallet operations |
| `minHeight` | `string \| number` | No | `600` | Minimum height of the SDK container (px or CSS value) |
| `className` | `string` | No | `''` | Custom class name for the container |
| `baseUrl` | `string` | No | Production URL | Custom API base URL (for testing) |
| `externalWalletKit` | `StellarWalletsKit \| null` | No | - | External wallet kit instance if host app has one |

## Authentication Flow

The SDK uses a delegated authentication pattern. Your backend is responsible for authenticating the user and obtaining an access token from the Venalabs API.

```
┌─────────┐      ┌──────────────┐      ┌──────────────┐
│   SDK   │      │ Your Backend │      │ Venalabs API │
└────┬────┘      └──────┬───────┘      └──────┬───────┘
     │                  │                     │
     │ getAccessToken() │                     │
     │─────────────────>│                     │
     │                  │                     │
     │                  │ POST /api/v1/sdk/auth/token
     │                  │ (API_KEY + API_SECRET + userId)
     │                  │────────────────────>│
     │                  │                     │
     │                  │     accessToken     │
     │                  │<────────────────────│
     │                  │                     │
     │   accessToken    │                     │
     │<─────────────────│                     │
     │                  │                     │
     │           API calls with token         │
     │───────────────────────────────────────>│
```

### Backend Implementation

Your backend must implement an endpoint that:
1. Authenticates the current user (via session, JWT, etc.)
2. Calls the Venalabs API to get an access token
3. Returns the token to the frontend

#### Node.js / Express

```typescript
// routes/venalabs.ts
import express from 'express';

const router = express.Router();

router.get('/venalabs-token', async (req, res) => {
  // 1. Get authenticated user from your session
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Call Venalabs API to get token
  const response = await fetch('https://api.venalabs.com/api/v1/sdk/auth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': process.env.VENALABS_API_KEY!,
    },
    body: JSON.stringify({
      apiSecret: process.env.VENALABS_API_SECRET!,
      userId: userId,
    }),
  });

  const data = await response.json();

  // 3. Return token to frontend
  res.json({ accessToken: data.accessToken });
});

export default router;
```

#### Next.js API Route

```typescript
// pages/api/venalabs-token.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Get authenticated user from your session
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Call Venalabs API to get token
  const response = await fetch('https://api.venalabs.com/api/v1/sdk/auth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': process.env.VENALABS_API_KEY!,
    },
    body: JSON.stringify({
      apiSecret: process.env.VENALABS_API_SECRET!,
      userId: userId,
    }),
  });

  const data = await response.json();

  // 3. Return token to frontend
  res.json({ accessToken: data.accessToken });
}
```

#### PHP

```php
<?php
// api/venalabs-token.php

// 1. Get authenticated user from your session
session_start();
$userId = $_SESSION['userId'] ?? null;

if (!$userId) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// 2. Call Venalabs API to get token
$response = file_get_contents('https://api.venalabs.com/api/v1/sdk/auth/token', false, stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => [
            'Content-Type: application/json',
            'X-Api-Key: ' . $_ENV['VENALABS_API_KEY'],
        ],
        'content' => json_encode([
            'apiSecret' => $_ENV['VENALABS_API_SECRET'],
            'userId' => $userId,
        ]),
    ],
]));

$data = json_decode($response, true);

// 3. Return token to frontend
header('Content-Type: application/json');
echo json_encode(['accessToken' => $data['accessToken']]);
```

#### Python / Flask

```python
from flask import Flask, session, jsonify
import requests
import os

app = Flask(__name__)

@app.route('/api/venalabs-token')
def get_venalabs_token():
    # 1. Get authenticated user from your session
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    # 2. Call Venalabs API to get token
    response = requests.post(
        'https://api.venalabs.com/api/v1/sdk/auth/token',
        headers={
            'Content-Type': 'application/json',
            'X-Api-Key': os.environ['VENALABS_API_KEY'],
        },
        json={
            'apiSecret': os.environ['VENALABS_API_SECRET'],
            'userId': user_id,
        }
    )
    data = response.json()

    # 3. Return token to frontend
    return jsonify({'accessToken': data['accessToken']})
```

## Complete Integration Example

```tsx
// pages/courses.tsx (Next.js example)
'use client';

import { useCallback } from 'react';
import VenalabsStellarSDK from '@venalabs/stellar-sdk';
import '@venalabs/stellar-sdk/style.css';

export default function CoursesPage() {
  // Token provider function - called by SDK when needed
  const getAccessToken = useCallback(async () => {
    const res = await fetch('/api/venalabs-token', {
      credentials: 'include', // Important: include cookies for auth
    });

    if (!res.ok) {
      throw new Error('Failed to get access token');
    }

    const data = await res.json();
    return data.accessToken;
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <VenalabsStellarSDK
        apiKey={process.env.NEXT_PUBLIC_VENALABS_API_KEY!}
        getAccessToken={getAccessToken}
        lang="en"
        stellarNetwork="PUBLIC"
        minHeight="100vh"
      />
    </div>
  );
}
```

## Automatic Token Refresh

The SDK automatically handles token expiration:
- When a 401 response is received, the SDK calls `getAccessToken` again
- The new token is cached and used for subsequent requests
- Concurrent requests during refresh are queued to avoid multiple token fetches

This means your `getAccessToken` function should always return a fresh token from your backend.

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `INVALID_API_KEY` | API key is incorrect or revoked | Check API key in your Airdroped dashboard |
| `INVALID_API_SECRET` | API secret is incorrect | Check API secret in your Airdroped dashboard |
| `INVALID_TOKEN` | Access token is invalid | Ensure your backend is correctly calling the Venalabs auth endpoint |
| `TOKEN_EXPIRED` | Access token has expired | SDK should auto-refresh; check `getAccessToken` implementation |
| `RATE_LIMITED` | Too many requests | Implement request throttling or contact support |
| CORS error | Domain not whitelisted | Add your domain in the Airdroped dashboard or contact support |
| Blank/unstyled screen | CSS not imported | Add `import '@venalabs/stellar-sdk/style.css'` to your app |
| Wallet connection fails | Wrong network | Ensure `stellarNetwork` matches your wallet's network |

## TypeScript Support

The SDK is fully typed. Import types as needed:

```typescript
import VenalabsStellarSDK, {
  VenalabsStellarSDKProps,
  TokenProvider,
  VenalabsCourse,
  VenalabsProgress
} from '@venalabs/stellar-sdk';
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Security Notes

- **Never expose your API Secret** in client-side code
- Always call the Venalabs auth endpoint from your backend
- Implement proper user authentication before generating tokens
- Use HTTPS for all API communications

## Support

- Documentation: [https://docs.airdroped.io/sdk](https://docs.airdroped.io/sdk)
- Issues: [https://github.com/venalabs/venalabs-stellar-sdk/issues](https://github.com/venalabs/venalabs-stellar-sdk/issues)
- Email: support@airdroped.io

## License

MIT
