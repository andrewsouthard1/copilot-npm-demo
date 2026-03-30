const express = require('express');
const nodemailer = require('nodemailer');
const cron = require('cron');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const swaggerUi = require('swagger-ui-express');
const bcrypt = require('bcrypt');
const sqlInjectionDemoRoutes = require('./storefront');
const sqlInjectionDemoExtra = require('./backend');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const escapeHtml = require('escape-html');
const winston = require('winston');
const path = require('path');
const fs = require('fs');
// New packages
const multer = require('multer');
const QRCode = require('qrcode');
const csv = require('csv-parser');
const compression = require('compression');
const { RateLimiterMemory } = require('rate-limiter-flexible');
// Recently added packages
const chalk = require('chalk');
const dayjs = require('dayjs');
const fetch = require('node-fetch');
const yup = require('yup');
const { z } = require('zod');
// OAuth packages
const passport = require('passport');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const DiscordStrategy = require('passport-discord').Strategy;
const AppleStrategy = require('passport-apple').Strategy;
require('dotenv').config();

// Temporarily comment out AI components for login testing
// const AIChatApp = require('./ai-chat');
// const AIUtils = require('./ai-utils');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'npm-demo-app' },
  transports: [
    new winston.transports.File({ filename: 'app.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Swagger API documentation
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Enhanced Node.js Demo API',
    version: '1.0.0',
    description: 'A comprehensive API with email, image processing, scheduling, and unique ID generation',
  },
  servers: [
    {
      url: `http://localhost:${PORT}`,
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/api/auth/login': {
      post: {
        summary: 'User login (Local authentication)',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string', description: 'Username for local authentication' },
                  password: { type: 'string', description: 'Password for local authentication' },
                  method: { type: 'string', enum: ['local', 'google', 'facebook', 'github', 'microsoft', 'twitter', 'linkedin', 'discord', 'apple'], default: 'local', description: 'Authentication method' }
                },
                required: ['username', 'password']
              }
            }
          }
        },
        responses: {
          200: { 
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    method: { type: 'string' },
                    token: { type: 'string' },
                    sessionId: { type: 'string' },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'number' },
                        username: { type: 'string' },
                        email: { type: 'string' },
                        provider: { type: 'string' },
                        avatar: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Invalid request or authentication method' },
          401: { description: 'Invalid credentials' }
        }
      }
    },
    '/api/auth/google': {
      get: {
        summary: 'Google OAuth login',
        tags: ['Authentication', 'OAuth'],
        description: 'Redirects to Google OAuth consent screen',
        responses: {
          302: { description: 'Redirect to Google OAuth' }
        }
      }
    },
    '/api/auth/google/callback': {
      get: {
        summary: 'Google OAuth callback',
        tags: ['Authentication', 'OAuth'],
        description: 'Handles Google OAuth callback and redirects to frontend',
        parameters: [
          {
            name: 'code',
            in: 'query',
            description: 'Authorization code from Google',
            schema: { type: 'string' }
          }
        ],
        responses: {
          302: { description: 'Redirect to frontend with token' },
          401: { description: 'Authentication failed' }
        }
      }
    },
    '/api/auth/facebook': {
      get: {
        summary: 'Facebook OAuth login',
        tags: ['Authentication', 'OAuth'],
        description: 'Redirects to Facebook OAuth consent screen',
        responses: {
          302: { description: 'Redirect to Facebook OAuth' }
        }
      }
    },
    '/api/auth/facebook/callback': {
      get: {
        summary: 'Facebook OAuth callback',
        tags: ['Authentication', 'OAuth'],
        description: 'Handles Facebook OAuth callback and redirects to frontend',
        parameters: [
          {
            name: 'code',
            in: 'query',
            description: 'Authorization code from Facebook',
            schema: { type: 'string' }
          }
        ],
        responses: {
          302: { description: 'Redirect to frontend with token' },
          401: { description: 'Authentication failed' }
        }
      }
    },
    '/api/auth/github': {
      get: {
        summary: 'GitHub OAuth login',
        tags: ['Authentication', 'OAuth'],
        description: 'Redirects to GitHub OAuth consent screen',
        responses: {
          302: { description: 'Redirect to GitHub OAuth' }
        }
      }
    },
    '/api/auth/github/callback': {
      get: {
        summary: 'GitHub OAuth callback',
        tags: ['Authentication', 'OAuth'],
        description: 'Handles GitHub OAuth callback and redirects to frontend',
        parameters: [
          {
            name: 'code',
            in: 'query',
            description: 'Authorization code from GitHub',
            schema: { type: 'string' }
          }
        ],
        responses: {
          302: { description: 'Redirect to frontend with token' },
          401: { description: 'Authentication failed' }
        }
      }
    },
    '/api/auth/microsoft': {
      get: {
        summary: 'Microsoft OAuth login',
        tags: ['Authentication', 'OAuth'],
        description: 'Redirects to Microsoft OAuth consent screen',
        responses: {
          302: { description: 'Redirect to Microsoft OAuth' }
        }
      }
    },
    '/api/auth/microsoft/callback': {
      get: {
        summary: 'Microsoft OAuth callback',
        tags: ['Authentication', 'OAuth'],
        description: 'Handles Microsoft OAuth callback and redirects to frontend',
        parameters: [
          {
            name: 'code',
            in: 'query',
            description: 'Authorization code from Microsoft',
            schema: { type: 'string' }
          }
        ],
        responses: {
          302: { description: 'Redirect to frontend with token' },
          401: { description: 'Authentication failed' }
        }
      }
    },
    '/api/auth/twitter': {
      get: {
        summary: 'Twitter OAuth login',
        tags: ['Authentication', 'OAuth'],
        description: 'Redirects to Twitter OAuth consent screen',
        responses: {
          302: { description: 'Redirect to Twitter OAuth' }
        }
      }
    },
    '/api/auth/twitter/callback': {
      get: {
        summary: 'Twitter OAuth callback',
        tags: ['Authentication', 'OAuth'],
        description: 'Handles Twitter OAuth callback and redirects to frontend',
        parameters: [
          {
            name: 'oauth_token',
            in: 'query',
            description: 'OAuth token from Twitter',
            schema: { type: 'string' }
          },
          {
            name: 'oauth_verifier',
            in: 'query',
            description: 'OAuth verifier from Twitter',
            schema: { type: 'string' }
          }
        ],
        responses: {
          302: { description: 'Redirect to frontend with token' },
          401: { description: 'Authentication failed' }
        }
      }
    },
    '/api/auth/linkedin': {
      get: {
        summary: 'LinkedIn OAuth login',
        tags: ['Authentication', 'OAuth'],
        description: 'Redirects to LinkedIn OAuth consent screen',
        responses: {
          302: { description: 'Redirect to LinkedIn OAuth' }
        }
      }
    },
    '/api/auth/linkedin/callback': {
      get: {
        summary: 'LinkedIn OAuth callback',
        tags: ['Authentication', 'OAuth'],
        description: 'Handles LinkedIn OAuth callback and redirects to frontend',
        parameters: [
          {
            name: 'code',
            in: 'query',
            description: 'Authorization code from LinkedIn',
            schema: { type: 'string' }
          }
        ],
        responses: {
          302: { description: 'Redirect to frontend with token' },
          401: { description: 'Authentication failed' }
        }
      }
    },
    '/api/auth/discord': {
      get: {
        summary: 'Discord OAuth login',
        tags: ['Authentication', 'OAuth'],
        description: 'Redirects to Discord OAuth consent screen',
        responses: {
          302: { description: 'Redirect to Discord OAuth' }
        }
      }
    },
    '/api/auth/discord/callback': {
      get: {
        summary: 'Discord OAuth callback',
        tags: ['Authentication', 'OAuth'],
        description: 'Handles Discord OAuth callback and redirects to frontend',
        parameters: [
          {
            name: 'code',
            in: 'query',
            description: 'Authorization code from Discord',
            schema: { type: 'string' }
          }
        ],
        responses: {
          302: { description: 'Redirect to frontend with token' },
          401: { description: 'Authentication failed' }
        }
      }
    },
    '/api/auth/apple': {
      get: {
        summary: 'Apple Sign In OAuth login',
        tags: ['Authentication', 'OAuth'],
        description: 'Redirects to Apple Sign In consent screen',
        responses: {
          302: { description: 'Redirect to Apple OAuth' }
        }
      }
    },
    '/api/auth/apple/callback': {
      get: {
        summary: 'Apple Sign In OAuth callback',
        tags: ['Authentication', 'OAuth'],
        description: 'Handles Apple Sign In OAuth callback and redirects to frontend',
        parameters: [
          {
            name: 'code',
            in: 'query',
            description: 'Authorization code from Apple',
            schema: { type: 'string' }
          }
        ],
        responses: {
          302: { description: 'Redirect to frontend with token' },
          401: { description: 'Authentication failed' }
        }
      }
    },
    '/api/auth/logout': {
      post: {
        summary: 'User logout',
        tags: ['Authentication'],
        description: 'Logs out user and destroys session',
        responses: {
          200: { 
            description: 'Logout successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    logoutId: { type: 'string' }
                  }
                }
              }
            }
          },
          500: { description: 'Logout failed' }
        }
      }
    },
    '/api/auth/status': {
      get: {
        summary: 'Get authentication status',
        tags: ['Authentication'],
        description: 'Returns current authentication status and available methods',
        responses: {
          200: { 
            description: 'Authentication status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    authenticated: { type: 'boolean' },
                    user: {
                      type: 'object',
                      properties: {
                        id: { type: 'number' },
                        username: { type: 'string' },
                        email: { type: 'string' },
                        provider: { type: 'string' },
                        avatar: { type: 'string' }
                      }
                    },
                    statusId: { type: 'string' },
                    availableMethods: {
                      type: 'object',
                      properties: {
                        local: { type: 'string' },
                        google: { type: 'string' },
                        facebook: { type: 'string' },
                        github: { type: 'string' },
                        microsoft: { type: 'string' },
                        twitter: { type: 'string' },
                        linkedin: { type: 'string' },
                        discord: { type: 'string' },
                        apple: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/failure': {
      get: {
        summary: 'OAuth authentication failure',
        tags: ['Authentication', 'OAuth'],
        description: 'Handles OAuth authentication failures',
        responses: {
          401: { 
            description: 'Authentication failed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                    failureId: { type: 'string' },
                    message: { type: 'string' },
                    availableMethods: {
                      type: 'object',
                      properties: {
                        local: { type: 'string' },
                        google: { type: 'string' },
                        facebook: { type: 'string' },
                        github: { type: 'string' },
                        microsoft: { type: 'string' },
                        twitter: { type: 'string' },
                        linkedin: { type: 'string' },
                        discord: { type: 'string' },
                        apple: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/user/profile': {
      get: {
        summary: 'Get user profile',
        tags: ['User'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Profile retrieved successfully' }
        }
      },
      put: {
        summary: 'Update user profile',
        tags: ['User'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Profile updated successfully' }
        }
      }
    },
    '/api/files/upload': {
      post: {
        summary: 'Upload file',
        tags: ['Files'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'File uploaded successfully' }
        }
      }
    },
    '/api/qr/generate': {
      post: {
        summary: 'Generate QR code',
        tags: ['QR Code'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  options: { type: 'object' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'QR code generated successfully' }
        }
      }
    },
    '/api/csv/process': {
      post: {
        summary: 'Process CSV file',
        tags: ['CSV'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  csvfile: { type: 'string', format: 'binary' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'CSV processed successfully' }
        }
      }
    },
    '/api/demo/rate-limited': {
      get: {
        summary: 'Rate limited endpoint demo',
        tags: ['Demo'],
        responses: {
          200: { description: 'Request successful' },
          429: { description: 'Rate limit exceeded' }
        }
      }
    },
    '/api/demo/large-data': {
      get: {
        summary: 'Large data with compression demo',
        tags: ['Demo'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Large data response (compressed)' }
        }
      }
    },
    '/api/email/send': {
      post: {
        summary: 'Send email',
        tags: ['Email'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Email sent successfully' }
        }
      }
    },
    '/api/images/process': {
      post: {
        summary: 'Process image',
        tags: ['Images'],
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Image processed successfully' }
        }
      }
    }
  }
};

// Initialize AI services - temporarily commented out for login testing
// const aiChat = new AIChatApp();
// const aiUtils = new AIUtils();

// Create directories if they don't exist
const createDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

createDir('uploads');
createDir('processed');
createDir('temp');
createDir('csv-uploads');

// In-memory user store (for demo purposes)
const users = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    password: '$2b$10$QbBPUJHnxu9bK/zXoJzenOoZDNRxT3b30PpqDAdHSUC2eafJoNDpS', // "password123"
    provider: 'local',
    providerId: null,
    createdAt: new Date().toISOString(),
    lastLogin: null
  }
];

// OAuth user counter for generating unique IDs
let userIdCounter = 2;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadType = req.path.includes('csv') ? 'csv-uploads' : 'uploads';
    cb(null, uploadType);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (req.path.includes('csv')) {
      // Only allow CSV files for CSV upload route
      if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV files are allowed'));
      }
    } else {
      // Allow common file types for general upload
      const allowedTypes = /jpeg|jpg|png|gif|pdf|txt|doc|docx/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        cb(null, true);
      } else {
        cb(new Error('File type not supported'));
      }
    }
  }
});

// Rate limiter configuration
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 10, // Number of requests
  duration: 60, // Per 60 seconds
});

const rateLimiterMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: secs
    });
  }
};

// Session configuration for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET environment variable must be set in production');
    }
    return 'dev-session-secret-not-for-production';
  })(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport configuration
passport.use(new LocalStrategy(
  {
    usernameField: 'username',
    passwordField: 'password'
  },
  async (username, password, done) => {
    try {
      const user = findUserByUsername(username);
      if (!user) {
        return done(null, false, { message: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return done(null, false, { message: 'Invalid credentials' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    let user = users.find(u => u.provider === 'google' && u.providerId === profile.id);
    
    if (user) {
      user.lastLogin = new Date().toISOString();
      return done(null, user);
    }

    // Create new user
    user = {
      id: userIdCounter++,
      username: profile.displayName || profile.emails[0].value.split('@')[0],
      email: profile.emails[0].value,
      provider: 'google',
      providerId: profile.id,
      avatar: profile.photos[0]?.value,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    users.push(user);
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Facebook OAuth Strategy
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "/api/auth/facebook/callback",
  profileFields: ['id', 'displayName', 'email', 'photos']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    let user = users.find(u => u.provider === 'facebook' && u.providerId === profile.id);
    
    if (user) {
      user.lastLogin = new Date().toISOString();
      return done(null, user);
    }

    // Create new user
    user = {
      id: userIdCounter++,
      username: profile.displayName || profile.emails?.[0]?.value?.split('@')[0] || `facebook_${profile.id}`,
      email: profile.emails?.[0]?.value || null,
      provider: 'facebook',
      providerId: profile.id,
      avatar: profile.photos?.[0]?.value,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    users.push(user);
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "/api/auth/github/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    let user = users.find(u => u.provider === 'github' && u.providerId === profile.id);
    
    if (user) {
      user.lastLogin = new Date().toISOString();
      return done(null, user);
    }

    // Create new user
    user = {
      id: userIdCounter++,
      username: profile.username || profile.displayName,
      email: profile.emails?.[0]?.value || null,
      provider: 'github',
      providerId: profile.id,
      avatar: profile.photos?.[0]?.value,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    users.push(user);
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Microsoft OAuth Strategy
passport.use(new MicrosoftStrategy({
  clientID: process.env.MICROSOFT_CLIENT_ID,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  callbackURL: "/api/auth/microsoft/callback",
  scope: ['user.read']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    let user = users.find(u => u.provider === 'microsoft' && u.providerId === profile.id);
    
    if (user) {
      user.lastLogin = new Date().toISOString();
      return done(null, user);
    }

    // Create new user
    user = {
      id: userIdCounter++,
      username: profile.displayName || profile.emails?.[0]?.value?.split('@')[0] || `microsoft_${profile.id}`,
      email: profile.emails?.[0]?.value || null,
      provider: 'microsoft',
      providerId: profile.id,
      avatar: profile.photos?.[0]?.value,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    users.push(user);
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Twitter OAuth Strategy
passport.use(new TwitterStrategy({
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  callbackURL: "/api/auth/twitter/callback"
}, async (token, tokenSecret, profile, done) => {
  try {
    // Check if user already exists
    let user = users.find(u => u.provider === 'twitter' && u.providerId === profile.id);
    
    if (user) {
      user.lastLogin = new Date().toISOString();
      return done(null, user);
    }

    // Create new user
    user = {
      id: userIdCounter++,
      username: profile.username || profile.displayName || `twitter_${profile.id}`,
      email: profile.emails?.[0]?.value || null,
      provider: 'twitter',
      providerId: profile.id,
      avatar: profile.photos?.[0]?.value,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    users.push(user);
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// LinkedIn OAuth Strategy
passport.use(new LinkedInStrategy({
  clientID: process.env.LINKEDIN_CLIENT_ID,
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  callbackURL: "/api/auth/linkedin/callback",
  scope: ['r_emailaddress', 'r_liteprofile']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    let user = users.find(u => u.provider === 'linkedin' && u.providerId === profile.id);
    
    if (user) {
      user.lastLogin = new Date().toISOString();
      return done(null, user);
    }

    // Create new user
    user = {
      id: userIdCounter++,
      username: profile.displayName || profile.emails?.[0]?.value?.split('@')[0] || `linkedin_${profile.id}`,
      email: profile.emails?.[0]?.value || null,
      provider: 'linkedin',
      providerId: profile.id,
      avatar: profile.photos?.[0]?.value,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    users.push(user);
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Discord OAuth Strategy
passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: "/api/auth/discord/callback",
  scope: ['identify', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    let user = users.find(u => u.provider === 'discord' && u.providerId === profile.id);
    
    if (user) {
      user.lastLogin = new Date().toISOString();
      return done(null, user);
    }

    // Create new user
    user = {
      id: userIdCounter++,
      username: profile.username || profile.global_name || `discord_${profile.id}`,
      email: profile.email || null,
      provider: 'discord',
      providerId: profile.id,
      avatar: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : null,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    users.push(user);
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Apple OAuth Strategy
passport.use(new AppleStrategy({
  clientID: process.env.APPLE_CLIENT_ID,
  teamID: process.env.APPLE_TEAM_ID,
  keyID: process.env.APPLE_KEY_ID,
  privateKeyString: process.env.APPLE_PRIVATE_KEY,
  callbackURL: "/api/auth/apple/callback",
  scope: ['name', 'email']
}, async (accessToken, refreshToken, idToken, profile, done) => {
  try {
    // Check if user already exists
    let user = users.find(u => u.provider === 'apple' && u.providerId === profile.id);
    
    if (user) {
      user.lastLogin = new Date().toISOString();
      return done(null, user);
    }

    // Create new user
    user = {
      id: userIdCounter++,
      username: profile.name?.firstName && profile.name?.lastName 
        ? `${profile.name.firstName} ${profile.name.lastName}`
        : profile.email?.split('@')[0] || `apple_${profile.id}`,
      email: profile.email || null,
      provider: 'apple',
      providerId: profile.id,
      avatar: null, // Apple doesn't provide profile pictures
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    users.push(user);
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = users.find(u => u.id === id);
  done(null, user);
});

// Middleware setup
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(compression()); // Enable response compression
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Demonstration routes (SQL injection demo in separate module)
app.use(sqlInjectionDemoRoutes);
app.use(sqlInjectionDemoExtra);

// JWT authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Ensure JWT_SECRET is set in production
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    logger.error('JWT_SECRET environment variable is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Helper functions
const findUserByUsername = (username) => {
  return users.find(user => user.username === username);
};

// Cron job for daily cleanup
const cleanupJob = new cron.CronJob('0 0 * * *', () => {
  const cleanupId = uuidv4();
  logger.info('Running daily cleanup job', { cleanupId });
  
  // Clean up temporary files older than 24 hours
  const tempDir = path.join(__dirname, 'temp');
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      if (stats.mtime.getTime() < oneDayAgo) {
        fs.unlinkSync(filePath);
        logger.info('Cleaned up old temp file', { file, cleanupId });
      }
    });
  }
}, null, true, 'America/New_York');

// Routes

// Health check
app.get('/health', (req, res) => {
  const healthId = uuidv4();
  const now = dayjs();
  res.json({ 
    id: healthId,
    status: 'OK', 
    timestamp: now.toISOString(),
    uptime: process.uptime(),
    serverStartTime: now.subtract(process.uptime(), 'second').format('YYYY-MM-DD HH:mm:ss'),
    features: {
      email: 'nodemailer',
      scheduling: 'cron',
      imageProcessing: 'sharp',
      uniqueIds: 'uuid',
      documentation: 'swagger-ui-express',
      colorfulConsole: 'chalk',
      modernDates: 'dayjs',
      httpRequests: 'node-fetch',
      schemaValidation: 'yup & zod'
    },
    cronJobs: {
      cleanup: cleanupJob.running
    },
    newPackages: {
      chalk: 'Colorful console output',
      dayjs: 'Modern date manipulation library',
      'node-fetch': 'Fetch API for Node.js',
      yup: 'JavaScript schema builder for value parsing and validation',
      zod: 'TypeScript-first schema validation with static type inference'
    }
  });
});

// Enhanced login endpoint with multiple authentication methods
app.post('/api/auth/login', async (req, res) => {
  const { method = 'local' } = req.body;
  
  if (method === 'local') {
    // Handle traditional username/password login
    return handleLocalLogin(req, res);
  } else {
    const supportedOAuthMethods = [
      'google', 'facebook', 'github', 'microsoft', 
      'twitter', 'linkedin', 'discord', 'apple'
    ];
    
    if (supportedOAuthMethods.includes(method)) {
      return res.status(400).json({ 
        error: 'OAuth method not supported via POST',
        method: method,
        redirectTo: `/api/auth/${method}`,
        message: `For ${method} OAuth authentication, redirect to GET /api/auth/${method}`,
        availableMethods: {
          local: '/api/auth/login',
          google: '/api/auth/google',
          facebook: '/api/auth/facebook',
          github: '/api/auth/github',
          microsoft: '/api/auth/microsoft',
          twitter: '/api/auth/twitter',
          linkedin: '/api/auth/linkedin',
          discord: '/api/auth/discord',
          apple: '/api/auth/apple'
        }
      });
    } else {
      return res.status(400).json({ 
        error: 'Invalid authentication method',
        supportedMethods: ['local'],
        oauthMethods: supportedOAuthMethods,
        message: 'For OAuth authentication, use the respective OAuth endpoints'
      });
    }
  }
});

// Traditional login handler
async function handleLocalLogin(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = findUserByUsername(username);
    if (!user) {
      logger.warn('Login attempt with invalid username', { username });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      logger.warn('Login attempt with invalid password', { username });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date().toISOString();

    const sessionId = uuidv4();
    
    // Ensure JWT_SECRET is set in production
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET environment variable is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        email: user.email,
        provider: user.provider,
        sessionId
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    logger.info('Successful local login', { username, userId: user.id, sessionId, provider: 'local' });

    res.json({
      message: 'Login successful',
      method: 'local',
      token,
      sessionId,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        provider: user.provider,
        avatar: user.avatar
      }
    });

  } catch (error) {
    logger.error('Login error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
}

// OAuth Routes

// Google OAuth
app.get('/api/auth/google', 
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/api/auth/failure' }),
  async (req, res) => {
    try {
      const sessionId = uuidv4();
      const jwtSecret = process.env.JWT_SECRET;
      
      if (!jwtSecret) {
        logger.error('JWT_SECRET environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const token = jwt.sign(
        {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          provider: req.user.provider,
          sessionId
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      logger.info('Successful Google OAuth login', { 
        userId: req.user.id, 
        username: req.user.username,
        sessionId,
        provider: 'google'
      });

      // Redirect to frontend with token (in production, use secure cookie or redirect to frontend)
      const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/success?token=${token}&provider=google`;
      res.redirect(redirectUrl);
    } catch (error) {
      logger.error('Google OAuth callback error', { error: error.message });
      res.redirect('/api/auth/failure');
    }
  }
);

// Facebook OAuth
app.get('/api/auth/facebook',
  passport.authenticate('facebook', { scope: ['email'] })
);

app.get('/api/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/api/auth/failure' }),
  async (req, res) => {
    try {
      const sessionId = uuidv4();
      const jwtSecret = process.env.JWT_SECRET;
      
      if (!jwtSecret) {
        logger.error('JWT_SECRET environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const token = jwt.sign(
        {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          provider: req.user.provider,
          sessionId
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      logger.info('Successful Facebook OAuth login', { 
        userId: req.user.id, 
        username: req.user.username,
        sessionId,
        provider: 'facebook'
      });

      const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/success?token=${token}&provider=facebook`;
      res.redirect(redirectUrl);
    } catch (error) {
      logger.error('Facebook OAuth callback error', { error: error.message });
      res.redirect('/api/auth/failure');
    }
  }
);

// GitHub OAuth
app.get('/api/auth/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/api/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/api/auth/failure' }),
  async (req, res) => {
    try {
      const sessionId = uuidv4();
      const jwtSecret = process.env.JWT_SECRET;
      
      if (!jwtSecret) {
        logger.error('JWT_SECRET environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const token = jwt.sign(
        {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          provider: req.user.provider,
          sessionId
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      logger.info('Successful GitHub OAuth login', { 
        userId: req.user.id, 
        username: req.user.username,
        sessionId,
        provider: 'github'
      });

      const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/success?token=${token}&provider=github`;
      res.redirect(redirectUrl);
    } catch (error) {
      logger.error('GitHub OAuth callback error', { error: error.message });
      res.redirect('/api/auth/failure');
    }
  }
);

// Microsoft OAuth
app.get('/api/auth/microsoft', 
  passport.authenticate('microsoft', { scope: ['user.read'] })
);

app.get('/api/auth/microsoft/callback',
  passport.authenticate('microsoft', { failureRedirect: '/api/auth/failure' }),
  async (req, res) => {
    try {
      const sessionId = uuidv4();
      const jwtSecret = process.env.JWT_SECRET;
      
      if (!jwtSecret) {
        logger.error('JWT_SECRET environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const token = jwt.sign(
        {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          provider: req.user.provider,
          sessionId
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      logger.info('Successful Microsoft OAuth login', { 
        userId: req.user.id, 
        username: req.user.username,
        sessionId,
        provider: 'microsoft'
      });

      const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/success?token=${token}&provider=microsoft`;
      res.redirect(redirectUrl);
    } catch (error) {
      logger.error('Microsoft OAuth callback error', { error: error.message });
      res.redirect('/api/auth/failure');
    }
  }
);

// Twitter OAuth
app.get('/api/auth/twitter',
  passport.authenticate('twitter')
);

app.get('/api/auth/twitter/callback',
  passport.authenticate('twitter', { failureRedirect: '/api/auth/failure' }),
  async (req, res) => {
    try {
      const sessionId = uuidv4();
      const jwtSecret = process.env.JWT_SECRET;
      
      if (!jwtSecret) {
        logger.error('JWT_SECRET environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const token = jwt.sign(
        {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          provider: req.user.provider,
          sessionId
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      logger.info('Successful Twitter OAuth login', { 
        userId: req.user.id, 
        username: req.user.username,
        sessionId,
        provider: 'twitter'
      });

      const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/success?token=${token}&provider=twitter`;
      res.redirect(redirectUrl);
    } catch (error) {
      logger.error('Twitter OAuth callback error', { error: error.message });
      res.redirect('/api/auth/failure');
    }
  }
);

// LinkedIn OAuth
app.get('/api/auth/linkedin',
  passport.authenticate('linkedin', { scope: ['r_emailaddress', 'r_liteprofile'] })
);

app.get('/api/auth/linkedin/callback',
  passport.authenticate('linkedin', { failureRedirect: '/api/auth/failure' }),
  async (req, res) => {
    try {
      const sessionId = uuidv4();
      const jwtSecret = process.env.JWT_SECRET;
      
      if (!jwtSecret) {
        logger.error('JWT_SECRET environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const token = jwt.sign(
        {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          provider: req.user.provider,
          sessionId
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      logger.info('Successful LinkedIn OAuth login', { 
        userId: req.user.id, 
        username: req.user.username,
        sessionId,
        provider: 'linkedin'
      });

      const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/success?token=${token}&provider=linkedin`;
      res.redirect(redirectUrl);
    } catch (error) {
      logger.error('LinkedIn OAuth callback error', { error: error.message });
      res.redirect('/api/auth/failure');
    }
  }
);

// Discord OAuth
app.get('/api/auth/discord',
  passport.authenticate('discord', { scope: ['identify', 'email'] })
);

app.get('/api/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/api/auth/failure' }),
  async (req, res) => {
    try {
      const sessionId = uuidv4();
      const jwtSecret = process.env.JWT_SECRET;
      
      if (!jwtSecret) {
        logger.error('JWT_SECRET environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const token = jwt.sign(
        {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          provider: req.user.provider,
          sessionId
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      logger.info('Successful Discord OAuth login', { 
        userId: req.user.id, 
        username: req.user.username,
        sessionId,
        provider: 'discord'
      });

      const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/success?token=${token}&provider=discord`;
      res.redirect(redirectUrl);
    } catch (error) {
      logger.error('Discord OAuth callback error', { error: error.message });
      res.redirect('/api/auth/failure');
    }
  }
);

// Apple OAuth
app.get('/api/auth/apple',
  passport.authenticate('apple', { scope: ['name', 'email'] })
);

app.get('/api/auth/apple/callback',
  passport.authenticate('apple', { failureRedirect: '/api/auth/failure' }),
  async (req, res) => {
    try {
      const sessionId = uuidv4();
      const jwtSecret = process.env.JWT_SECRET;
      
      if (!jwtSecret) {
        logger.error('JWT_SECRET environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const token = jwt.sign(
        {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          provider: req.user.provider,
          sessionId
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      logger.info('Successful Apple OAuth login', { 
        userId: req.user.id, 
        username: req.user.username,
        sessionId,
        provider: 'apple'
      });

      const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/success?token=${token}&provider=apple`;
      res.redirect(redirectUrl);
    } catch (error) {
      logger.error('Apple OAuth callback error', { error: error.message });
      res.redirect('/api/auth/failure');
    }
  }
);

// OAuth failure handler
app.get('/api/auth/failure', (req, res) => {
  const failureId = uuidv4();
  logger.warn('OAuth authentication failure', { failureId, session: req.session });
  
  res.status(401).json({
    error: 'Authentication failed',
    failureId,
    message: 'OAuth authentication was unsuccessful',
    availableMethods: {
      local: '/api/auth/login',
      google: '/api/auth/google',
      facebook: '/api/auth/facebook',
      github: '/api/auth/github',
      microsoft: '/api/auth/microsoft',
      twitter: '/api/auth/twitter',
      linkedin: '/api/auth/linkedin',
      discord: '/api/auth/discord',
      apple: '/api/auth/apple'
    }
  });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  const logoutId = uuidv4();
  
  req.logout((err) => {
    if (err) {
      logger.error('Logout error', { error: err.message, logoutId });
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    req.session.destroy((err) => {
      if (err) {
        logger.error('Session destruction error', { error: err.message, logoutId });
        return res.status(500).json({ error: 'Session cleanup failed' });
      }
      
      logger.info('Successful logout', { logoutId });
      res.json({ 
        message: 'Logged out successfully',
        logoutId 
      });
    });
  });
});

// Get authentication status
app.get('/api/auth/status', (req, res) => {
  const statusId = uuidv4();
  
  if (req.isAuthenticated && req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        provider: req.user.provider,
        avatar: req.user.avatar
      },
      statusId
    });
  } else {
    res.json({
      authenticated: false,
      statusId,
      availableMethods: {
        local: '/api/auth/login',
        google: '/api/auth/google',
        facebook: '/api/auth/facebook',
        github: '/api/auth/github'
      }
    });
  }
});

// Get user profile endpoint
app.get('/api/user/profile', authenticateToken, (req, res) => {
  try {
    const profileId = uuidv4();
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info('Profile retrieved', { 
      profileId, 
      userId: req.user.id, 
      username: req.user.username 
    });

    res.json({
      profileId,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt || new Date().toISOString(),
        lastLogin: user.lastLogin || new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Profile retrieval error', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// Update user profile endpoint
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const updateId = uuidv4();
    const userIndex = users.findIndex(u => u.id === req.user.id);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[userIndex];
    const updates = {};

    // Update email if provided
    if (email && email !== user.email) {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      updates.email = email;
    }

    // Update password if provided
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password required to set new password' });
      }

      const validCurrentPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validCurrentPassword) {
        logger.warn('Profile update attempt with invalid current password', { 
          updateId, 
          userId: req.user.id, 
          username: req.user.username 
        });
        return res.status(401).json({ error: 'Invalid current password' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
      }

      updates.password = await bcrypt.hash(newPassword, 10);
    }

    // Apply updates
    Object.assign(users[userIndex], updates);
    users[userIndex].updatedAt = new Date().toISOString();

    logger.info('Profile updated successfully', { 
      updateId,
      userId: req.user.id, 
      username: req.user.username,
      updatedFields: Object.keys(updates)
    });

    res.json({
      message: 'Profile updated successfully',
      updateId,
      updatedFields: Object.keys(updates),
      user: {
        id: users[userIndex].id,
        username: users[userIndex].username,
        email: users[userIndex].email,
        updatedAt: users[userIndex].updatedAt
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Profile update error', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// File upload endpoint using multer
app.post('/api/files/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    const uploadId = uuidv4();
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileInfo = {
      uploadId,
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path,
      uploadedAt: new Date().toISOString()
    };

    logger.info('File uploaded successfully', {
      uploadId,
      userId: req.user.id,
      filename: req.file.originalname,
      size: req.file.size
    });

    res.json({
      message: 'File uploaded successfully',
      file: fileInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('File upload error', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// QR Code generation endpoint using qrcode
app.post('/api/qr/generate', authenticateToken, rateLimiterMiddleware, async (req, res) => {
  try {
    const { text, options = {} } = req.body;
    const qrId = uuidv4();
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required for QR code generation' });
    }

    const qrOptions = {
      errorCorrectionLevel: options.errorCorrectionLevel || 'M',
      type: 'image/png',
      quality: options.quality || 0.92,
      margin: options.margin || 1,
      color: {
        dark: options.darkColor || '#000000',
        light: options.lightColor || '#FFFFFF'
      },
      width: options.width || 256
    };

    const qrCodeDataURL = await QRCode.toDataURL(text, qrOptions);
    
    logger.info('QR code generated successfully', {
      qrId,
      userId: req.user.id,
      textLength: text.length,
      options: qrOptions
    });

    res.json({
      message: 'QR code generated successfully',
      qrId,
      qrCode: qrCodeDataURL,
      text,
      options: qrOptions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('QR code generation error', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// CSV file processing endpoint using csv-parser
app.post('/api/csv/process', authenticateToken, upload.single('csvfile'), async (req, res) => {
  try {
    const processId = uuidv4();
    
    if (!req.file) {
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const results = [];
    const stats = {
      totalRows: 0,
      validRows: 0,
      errors: []
    };

    // Validate file path to prevent path traversal
    const filePath = path.resolve(req.file.path);
    const uploadDir = path.resolve('./uploads');
    if (!filePath.startsWith(uploadDir)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    const stream = fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        stats.totalRows++;
        try {
          // Basic validation - ensure data is not empty
          if (Object.keys(data).length > 0) {
            results.push(data);
            stats.validRows++;
          }
        } catch (err) {
          stats.errors.push(`Row ${stats.totalRows}: ${err.message}`);
        }
      })
      .on('end', () => {
        // Clean up uploaded file
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          logger.warn('Failed to cleanup uploaded file', { filePath, error: err.message });
        }
        
        logger.info('CSV processed successfully', {
          processId,
          userId: req.user.id,
          filename: req.file.originalname,
          totalRows: stats.totalRows,
          validRows: stats.validRows,
          errorCount: stats.errors.length
        });

        res.json({
          message: 'CSV file processed successfully',
          processId,
          filename: req.file.originalname,
          stats,
          data: results.slice(0, 100), // Return first 100 rows
          totalDataRows: results.length,
          timestamp: new Date().toISOString()
        });
      })
      .on('error', (error) => {
        // Clean up uploaded file on error
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (cleanupErr) {
          logger.warn('Failed to cleanup uploaded file on error', { filePath, error: cleanupErr.message });
        }
        
        logger.error('CSV processing error', { 
          error: error.message, 
          userId: req.user.id,
          processId 
        });
        
        res.status(500).json({ 
          error: 'Failed to process CSV file',
          processId,
          details: error.message 
        });
      });
  } catch (error) {
    logger.error('CSV upload error', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to upload CSV file' });
  }
});

// Rate limiting demonstration endpoint
app.get('/api/demo/rate-limited', rateLimiterMiddleware, (req, res) => {
  const demoId = uuidv4();
  
  logger.info('Rate limited endpoint accessed', { 
    demoId, 
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  res.json({
    message: 'This endpoint is rate limited to 10 requests per minute',
    demoId,
    ip: req.ip,
    timestamp: new Date().toISOString(),
    rateLimit: {
      points: 10,
      duration: '60 seconds',
      remaining: 'Check rate limit headers'
    }
  });
});

// Compression demonstration endpoint
app.get('/api/demo/large-data', authenticateToken, (req, res) => {
  const demoId = uuidv4();
  
  // Generate large JSON response to demonstrate compression
  const largeData = {
    demoId,
    message: 'This response demonstrates compression middleware',
    timestamp: new Date().toISOString(),
    data: Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      description: `This is a sample item with ID ${i + 1} created for compression demonstration`,
      tags: ['demo', 'compression', 'large-data', `tag-${i % 10}`],
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        version: '1.0.0'
      }
    }))
  };

  logger.info('Large data endpoint accessed', { 
    demoId, 
    userId: req.user.id,
    dataSize: JSON.stringify(largeData).length 
  });

  res.json(largeData);
});

// Send email endpoint using nodemailer
app.post('/api/email/send', authenticateToken, async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;
    const emailId = uuidv4();
    
    if (!to || !subject || !text) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, text' });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@example.com',
      to,
      subject,
      text,
      html: html || `<p>${text}</p>`,
      headers: {
        'X-Email-ID': emailId
      }
    };

    const info = await transporter.sendMail(mailOptions);
    
    logger.info('Email sent successfully', { 
      emailId,
      userId: req.user.id, 
      to, 
      subject,
      messageId: info.messageId 
    });

    res.json({
      message: 'Email sent successfully',
      emailId,
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Email send error', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Image processing endpoint using sharp
app.post('/api/images/process', authenticateToken, async (req, res) => {
  try {
    const { imageData, width, height, format, quality } = req.body;
    const processingId = uuidv4();
    
    if (!imageData) {
      return res.status(400).json({ error: 'Image data required (base64 encoded)' });
    }

    // Decode base64 image data
    const buffer = Buffer.from(imageData, 'base64');
    
    // Create sharp pipeline
    let pipeline = sharp(buffer);
    
    // Apply transformations
    if (width || height) {
      pipeline = pipeline.resize(
        width ? parseInt(width) : null,
        height ? parseInt(height) : null,
        { fit: 'inside', withoutEnlargement: true }
      );
    }
    
    if (quality && (format === 'jpeg' || format === 'jpg')) {
      pipeline = pipeline.jpeg({ quality: parseInt(quality) });
    }
    
    if (format) {
      switch (format.toLowerCase()) {
        case 'png':
          pipeline = pipeline.png();
          break;
        case 'webp':
          pipeline = pipeline.webp();
          break;
        case 'jpeg':
        case 'jpg':
          pipeline = pipeline.jpeg();
          break;
      }
    }
    
    // Process the image
    const processedBuffer = await pipeline.toBuffer();
    const processedBase64 = processedBuffer.toString('base64');
    
    // Get metadata
    const metadata = await sharp(buffer).metadata();
    const processedMetadata = await sharp(processedBuffer).metadata();
    
    logger.info('Image processed successfully', { 
      processingId,
      userId: req.user.id,
      originalSize: buffer.length,
      processedSize: processedBuffer.length,
      originalFormat: metadata.format,
      processedFormat: processedMetadata.format
    });

    res.json({
      message: 'Image processed successfully',
      processingId,
      processedImage: processedBase64,
      originalMetadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: buffer.length
      },
      processedMetadata: {
        width: processedMetadata.width,
        height: processedMetadata.height,
        format: processedMetadata.format,
        size: processedBuffer.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Image processing error', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to process image' });
  }
});

// Generate unique ID endpoint using uuid
app.get('/api/uuid/generate', (req, res) => {
  const { count = 1, type = 'v4' } = req.query;
  const requestId = uuidv4();
  
  try {
    const numCount = Math.min(parseInt(count) || 1, 100); // Max 100 IDs
    const ids = [];
    
    for (let i = 0; i < numCount; i++) {
      ids.push(uuidv4());
    }
    
    logger.info('UUIDs generated', { requestId, count: numCount, type });
    
    res.json({
      requestId,
      ids: numCount === 1 ? ids[0] : ids,
      count: numCount,
      type,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('UUID generation error', { error: error.message, requestId });
    res.status(500).json({ error: 'Failed to generate UUIDs' });
  }
});

// App-level explicit SQL injection POI for Snyk
app.get('/api/demo/sql-injection/app-snyk', (req, res) => {
  const userId = req.query.userId || '1';
  const unsafeQuery = 'SELECT * FROM users WHERE id = ' + userId; // unsafe concatenation
  res.status(200).json({
    mode: 'app-snyk',
    unsafeQuery,
    warning: 'Direct query concatenation should be flagged as SQL Injection source/sink.'
  });
});

// Postgres SQLi pattern for Snyk detection (unsafe concatenation)
app.get('/api/demo/sql-injection/pg-unsafe', async (req, res) => {
  const userId = req.query.userId;
  const unsafeQuery = "SELECT * FROM users WHERE id = " + userId;

  if (!process.env.DATABASE_URL) {
    return res.status(200).json({
      mode: 'pg-unsafe',
      message: 'DATABASE_URL not configured - demonstration only',
      unsafeQuery,
      userId
    });
  }

  const client = new (require('pg').Client)({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows } = await client.query(unsafeQuery);
    res.json({ mode: 'pg-unsafe', userId, unsafeQuery, rows });
  } catch (err) {
    res.status(500).json({ error: err.message, unsafeQuery });
  } finally {
    await client.end();
  }
});

// XSS vulnerable endpoint - direct HTML injection
app.get('/api/demo/xss/vulnerable', (req, res) => {
  const username = req.query.username || 'Guest';
  const html = `<h1>Welcome ${username}</h1>`;
  res.contentType('text/plain').send(html);
});

// XSS safe endpoint - escaped HTML
app.get('/api/demo/xss/safe', (req, res) => {
  const username = req.query.username || 'Guest';
  const escapedUsername = escapeHtml(username);
  const html = `<h1>Welcome ${escapedUsername}</h1>`;
  res.send(html);
});

// Backend XSS vulnerable endpoint
app.get('/api/demo/xss/backend-vulnerable', (req, res) => {
  const comment = req.query.comment || 'No comment';
  const html = `<div>User comment: ${comment}</div>`;
  res.contentType('text/plain').send(html);
});

// Backend XSS safe endpoint
app.get('/api/demo/xss/backend-safe', (req, res) => {
  const comment = req.query.comment || 'No comment';
  const escapedComment = escapeHtml(comment);
  const html = `<div>User comment: ${escapedComment}</div>`;
  res.send(html);
});

// Scheduled tasks management endpoint
app.get('/api/cron/status', authenticateToken, (req, res) => {
  const statusId = uuidv4();
  
  res.json({
    statusId,
    jobs: {
      cleanup: {
        running: cleanupJob.running,
        nextRun: cleanupJob.nextDate(),
        cronTime: cleanupJob.cronTime.source,
        timezone: cleanupJob.cronTime.zone
      }
    },
    timestamp: new Date().toISOString()
  });
});

// AI Chat endpoint with unique request tracking - temporarily disabled for login testing
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  res.status(503).json({ 
    error: 'AI chat temporarily disabled for testing',
    message: 'This endpoint is currently disabled while testing login functionality'
  });
});

// External data fetching endpoint using node-fetch
app.post('/api/external/fetch', authenticateToken, async (req, res) => {
  try {
    const { url, method = 'GET', headers = {}, body } = req.body;
    const fetchId = uuidv4();
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Enhanced URL validation to prevent SSRF
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Block private/internal networks to prevent SSRF
    const hostname = parsedUrl.hostname.toLowerCase();
    const blockedHosts = [
      'localhost', '127.0.0.1', '0.0.0.0',
      '10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.',
      '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.',
      '172.27.', '172.28.', '172.29.', '172.30.', '172.31.',
      '192.168.', '169.254.', 'metadata.google.internal'
    ];
    
    if (blockedHosts.some(blocked => hostname.includes(blocked)) || 
        parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return res.status(400).json({ error: 'URL not allowed for security reasons' });
    }

    const fetchOptions = {
      method,
      headers: {
        'User-Agent': 'npm-demo-app/1.0.0',
        ...headers
      }
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(body);
      fetchOptions.headers['Content-Type'] = 'application/json';
    }

    const startTime = dayjs();
    const response = await fetch(url, fetchOptions);
    const endTime = dayjs();
    const responseTime = endTime.diff(startTime, 'millisecond');

    const responseData = await response.text();
    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
    } catch {
      parsedData = responseData;
    }

    logger.info('External fetch completed', {
      fetchId,
      userId: req.user.id,
      url,
      method,
      status: response.status,
      responseTime
    });

    res.json({
      message: 'External fetch completed successfully',
      fetchId,
      request: {
        url,
        method,
        timestamp: startTime.toISOString()
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: parsedData,
        responseTime: `${responseTime}ms`,
        timestamp: endTime.toISOString()
      }
    });
  } catch (error) {
    logger.error('External fetch error', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to fetch external data', details: error.message });
  }
});

// Yup validation endpoint
app.post('/api/validate/yup', authenticateToken, async (req, res) => {
  try {
    const { data, schema: schemaConfig } = req.body;
    const validationId = uuidv4();
    
    if (!data || !schemaConfig) {
      return res.status(400).json({ error: 'Both data and schema configuration are required' });
    }

    // Create a sample user schema for demonstration
    const userSchema = yup.object().shape({
      name: yup.string().required('Name is required').min(2, 'Name must be at least 2 characters'),
      email: yup.string().email('Invalid email format').required('Email is required'),
      age: yup.number().positive('Age must be positive').integer('Age must be an integer').min(13, 'Must be at least 13 years old'),
      website: yup.string().url('Must be a valid URL').nullable(),
      createdAt: yup.date().default(() => new Date())
    });

    const validationStart = dayjs();
    const validatedData = await userSchema.validate(data, { abortEarly: false });
    const validationEnd = dayjs();
    const validationTime = validationEnd.diff(validationStart, 'millisecond');

    logger.info('Yup validation successful', {
      validationId,
      userId: req.user.id,
      validationTime
    });

    res.json({
      message: 'Data validation successful with Yup',
      validationId,
      originalData: data,
      validatedData,
      schema: 'User schema (name, email, age, website, createdAt)',
      validationTime: `${validationTime}ms`,
      timestamp: validationEnd.toISOString()
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      logger.warn('Yup validation failed', { 
        errors: error.errors, 
        userId: req.user.id 
      });
      
      res.status(400).json({
        error: 'Validation failed',
        validationErrors: error.errors,
        details: error.inner.map(err => ({
          field: err.path,
          message: err.message,
          value: err.value
        }))
      });
    } else {
      logger.error('Yup validation error', { error: error.message, userId: req.user.id });
      res.status(500).json({ error: 'Validation service error' });
    }
  }
});

// Zod validation endpoint
app.post('/api/validate/zod', authenticateToken, async (req, res) => {
  try {
    const { data } = req.body;
    const validationId = uuidv4();
    
    if (!data) {
      return res.status(400).json({ error: 'Data is required for validation' });
    }

    // Create a sample product schema for demonstration
    const productSchema = z.object({
      name: z.string().min(1, 'Product name is required').max(100, 'Name too long'),
      price: z.number().positive('Price must be positive'),
      category: z.enum(['electronics', 'clothing', 'books', 'home', 'sports']),
      inStock: z.boolean(),
      tags: z.array(z.string()).optional(),
      metadata: z.object({
        weight: z.number().positive().optional(),
        dimensions: z.object({
          length: z.number(),
          width: z.number(),
          height: z.number()
        }).optional()
      }).optional(),
      createdAt: z.date().default(new Date())
    });

    const validationStart = dayjs();
    const validatedData = productSchema.parse(data);
    const validationEnd = dayjs();
    const validationTime = validationEnd.diff(validationStart, 'millisecond');

    logger.info('Zod validation successful', {
      validationId,
      userId: req.user.id,
      validationTime
    });

    res.json({
      message: 'Data validation successful with Zod',
      validationId,
      originalData: data,
      validatedData,
      schema: 'Product schema (name, price, category, inStock, tags, metadata, createdAt)',
      validationTime: `${validationTime}ms`,
      timestamp: validationEnd.toISOString()
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Zod validation failed', { 
        errors: error.errors, 
        userId: req.user.id 
      });
      
      res.status(400).json({
        error: 'Validation failed',
        validationErrors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          received: err.received
        }))
      });
    } else {
      logger.error('Zod validation error', { error: error.message, userId: req.user.id });
      res.status(500).json({ error: 'Validation service error' });
    }
  }
});

// Error handling
app.use((err, req, res, next) => {
  const errorId = uuidv4();
  logger.error('Unhandled error', { 
    errorId,
    error: err.message, 
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({ 
    error: 'Something went wrong!',
    errorId 
  });
});

// 404 handler
app.use((req, res) => {
  const notFoundId = uuidv4();
  res.status(404).json({ 
    error: 'Route not found',
    requestId: notFoundId,
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  const startupId = uuidv4();
  logger.info(`Server started successfully`, { startupId, port: PORT });
  
  console.log(chalk.green.bold(`🚀 Server running on http://localhost:${PORT}`));
  console.log(chalk.cyan(`📋 Startup ID: ${startupId}`));
  console.log(chalk.yellow(`⏰ Started at: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`));
  console.log(chalk.blue.bold('\n🚀 Features Available:'));
  console.log(chalk.white('  📧 Email Service (nodemailer) - Send emails via API'));
  console.log(chalk.white('  ⏰ Task Scheduling (cron) - Automated daily cleanup'));
  console.log(chalk.white('  🖼️  Image Processing (sharp) - Resize, convert, optimize images'));
  console.log(chalk.white('  🆔 Unique IDs (uuid) - Generate UUIDs for all operations'));
  console.log(chalk.white('  📚 API Documentation (swagger-ui-express) - Interactive docs'));
  console.log(chalk.white('  📁 File Upload (multer) - Handle file uploads'));
  console.log(chalk.white('  📱 QR Code Generation (qrcode) - Generate QR codes'));
  console.log(chalk.white('  📊 CSV Processing (csv-parser) - Parse and process CSV files'));
  console.log(chalk.white('  🗜️  Response Compression (compression) - Compress responses'));
  console.log(chalk.white('  🚦 Rate Limiting (rate-limiter-flexible) - Advanced rate limiting'));
  console.log(chalk.white('  🎨 Colorful Console (chalk) - Enhanced console output'));
  console.log(chalk.white('  📅 Modern Dates (dayjs) - Modern date manipulation'));
  console.log(chalk.white('  🌐 HTTP Requests (node-fetch) - Fetch API for Node.js'));
  console.log(chalk.white('  ✅ Schema Validation (yup & zod) - Data validation'));
  console.log(chalk.magenta.bold('\n📋 Available endpoints:'));
  console.log(chalk.gray('  POST /api/auth/login - User authentication (local)'));
  console.log(chalk.gray('  GET  /api/auth/google - Google OAuth login'));
  console.log(chalk.gray('  GET  /api/auth/facebook - Facebook OAuth login'));
  console.log(chalk.gray('  GET  /api/auth/github - GitHub OAuth login'));
  console.log(chalk.gray('  GET  /api/auth/microsoft - Microsoft OAuth login'));
  console.log(chalk.gray('  GET  /api/auth/twitter - Twitter OAuth login'));
  console.log(chalk.gray('  GET  /api/auth/linkedin - LinkedIn OAuth login'));
  console.log(chalk.gray('  GET  /api/auth/discord - Discord OAuth login'));
  console.log(chalk.gray('  GET  /api/auth/apple - Apple Sign In OAuth login'));
  console.log(chalk.gray('  POST /api/auth/logout - User logout'));
  console.log(chalk.gray('  GET  /api/auth/status - Authentication status'));
  console.log(chalk.gray('  GET  /api/user/profile - Get user profile (requires auth)'));
  console.log(chalk.gray('  PUT  /api/user/profile - Update user profile (requires auth)'));
  console.log(chalk.gray('  POST /api/files/upload - Upload files (requires auth)'));
  console.log(chalk.gray('  POST /api/qr/generate - Generate QR codes (requires auth, rate limited)'));
  console.log(chalk.gray('  POST /api/csv/process - Process CSV files (requires auth)'));
  console.log(chalk.gray('  GET  /api/demo/rate-limited - Rate limiting demo (rate limited)'));
  console.log(chalk.gray('  GET  /api/demo/large-data - Compression demo (requires auth)'));
  console.log(chalk.gray('  POST /api/email/send - Send emails (requires auth)'));
  console.log(chalk.gray('  POST /api/images/process - Process images (requires auth)'));
  console.log(chalk.gray('  GET  /api/uuid/generate - Generate unique IDs'));
  console.log(chalk.gray('  GET  /api/cron/status - Check scheduled jobs (requires auth)'));
  console.log(chalk.gray('  POST /api/ai/chat - AI chat with request tracking (requires auth)'));
  console.log(chalk.gray('  POST /api/external/fetch - Fetch external data (requires auth)'));
  console.log(chalk.gray('  POST /api/validate/yup - Validate data with Yup (requires auth)'));
  console.log(chalk.gray('  POST /api/validate/zod - Validate data with Zod (requires auth)'));
  console.log(chalk.gray('  GET  /health - Health check with feature overview'));
  console.log(chalk.gray('  GET  /api-docs - Interactive API documentation'));
  console.log(chalk.green.bold('\n✨ All operations include unique request tracking and comprehensive logging!'));
});

module.exports = app;


