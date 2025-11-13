# Authentication Service (SellEasi)

The Authentication Service is a microservice within the SellEsi Platform that handles user authentication and authorization. It provides endpoints for user registration, login, permissions, and token management.

![Project Screenshot](/architecture/Main-Onboarding-1.png)

## Repo Location
```bash
SELLEASI-ARCHITECTURE/
└── authentication/
    ├── src/
    │   ├── controllers/
    │   ├── __tests__/ 
    │       │─────── unit/
    │       │─────── integration/
    │   ├── services/
    │   ├── models/
    │   ├── types/
    │   ├── config/
    │   ├── validators/
    │   ├── routes/
    │   └── middleware/
    ├── tests/
    ├── Dockerfile
    ├── package.json
    └── README.md
```

## Overview

The Auth Service is basically built with Node.js, TypeScript, MongoDB, KafkaJS, Grafana, Prometheus and Redis. It follows RESTful API design principles and implements proper authentication and authorization using JWT( both access and refersh token) and Redis for session management

### Routes

| Method | Endpoint                                        | Description                           |
| ------ | ---------------------------------------         | -------------------------             |
| POST   | `/api/v1/auth/auth/email/confirmation`          | Email onboarding confirmation         |
| POST   | `/api/v1/auth/auth/password/confirmation`       | Password onboarding                   |
| POST   | `/api/v1/auth/auth/signup`                      | Complete User onboarding              | 
| POST   | `/api/v1/auth/login`                            | User login                            |
| POST   | `/api/v1/auth/verify-otp`                       | User Verfication OTP                  |
| POST   | `/api/v1/auth/refresh`                          | Refresh access token                  |
| POST   | `/api/v1/auth/logout`                           | User logout                           |
| POST   | `/api/v1/auth/forgot-password`                  | Request password reset                |
| POST   | `/api/v1/auth/reset-password`                   | Reset password with token             |

## Environment Variables

The service requires the following environment variables:

### Required Variables

- `DATABASE_URL`: MongoDB connection string
- `JWT_SECRET`: JWT signing secret
- `IO_REDIS_URL`: Redis connection URL (e.g., you can use redis://localhost:6379)
- `PORT`: Service port (default: 4001)
- `FRONTEND_URl`: Frontend application URL for CORS configuration
- `KAFKA_BROKER`: Kafka broker URL
- `KAFKA_GROUP_ID`: Kafka consumer group ID
- `KAFKA_TOPIC_USER`: Kafka topic for user events

### Optional Variables

- `NODE_ENV`: Environment (development/production)
- `LOG_LEVEL`: Logging level (debug/info/warn/error)
- `JWT_EXPIRES_IN`: JWT token expiration time
- `REFRESH_TOKEN_EXPIRES_IN`: Refresh token expiration time

## Redis Configuration

Redis is used for:

- Storing TIN pools for different user types
- Session management
- Rate limiting

The service requires Redis to be running and accessible via the `IO_REDIS_URL` environment variable. The Redis instance should be configured with:

- Proper authentication if needed
- Persistence configuration if needed

## Kafka Integration

The service integrates with Kafka for:

- User creation events
- Authentication events
- Session management events

Ensure Kafka is running and accessible via the configured broker URL.
