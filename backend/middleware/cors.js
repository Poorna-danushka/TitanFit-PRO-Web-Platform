import cors from 'cors';

/**
 * CORS configuration supporting credentials & CSRF headers
 */
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5000',
      process.env.FRONTEND_URL,
      process.env.CORS_ORIGIN,
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token', 'X-XSRF-Token', 'xsrf-token', 'x-csrf-token'],
  exposedHeaders: ['Set-Cookie', 'X-CSRF-Token'],
  maxAge: 86400,
};

export const corsMiddleware = cors(corsOptions);
