# OAuth Authentication Setup

This application now supports multiple OAuth authentication methods in addition to traditional username/password login.

## Supported OAuth Providers

- **Google OAuth 2.0**
- **Facebook OAuth**
- **GitHub OAuth**
- **Local Authentication** (username/password)

## Environment Variables Required

Create a `.env` file in the root directory with the following variables:

```env
# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-here

# Session Configuration
SESSION_SECRET=your-super-secure-session-secret-here

# Client URL for OAuth redirects
CLIENT_URL=http://localhost:3000

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Facebook OAuth Configuration
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Server Configuration
PORT=3000
NODE_ENV=development
```

## OAuth Provider Setup

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Set authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
6. Copy Client ID and Client Secret to your `.env` file

### Facebook OAuth Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Set Valid OAuth Redirect URI: `http://localhost:3000/api/auth/facebook/callback`
5. Copy App ID and App Secret to your `.env` file

### GitHub OAuth Setup

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create a new OAuth App
3. Set Authorization callback URL: `http://localhost:3000/api/auth/github/callback`
4. Copy Client ID and Client Secret to your `.env` file

## Available Endpoints

### Authentication Endpoints

- `POST /api/auth/login` - Local username/password login
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/facebook` - Initiate Facebook OAuth
- `GET /api/auth/github` - Initiate GitHub OAuth
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/status` - Get authentication status

### OAuth Callback Endpoints

- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/facebook/callback` - Facebook OAuth callback
- `GET /api/auth/github/callback` - GitHub OAuth callback
- `GET /api/auth/failure` - OAuth failure handler

## Usage Examples

### Local Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password123"}'
```

### OAuth Login
Simply navigate to:
- `http://localhost:3000/api/auth/google` for Google
- `http://localhost:3000/api/auth/facebook` for Facebook
- `http://localhost:3000/api/auth/github` for GitHub

### Check Authentication Status
```bash
curl http://localhost:3000/api/auth/status
```

### Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout
```

## Security Features

- JWT tokens with 24-hour expiration
- Secure session management
- CORS protection with configurable origins
- Environment-based security configuration
- Comprehensive logging for all authentication events
- Rate limiting on sensitive endpoints

## API Documentation

Visit `http://localhost:3000/api-docs` for interactive Swagger documentation with all OAuth endpoints documented.
