### AKIRS-BACKEND Backend# Auth Service

The Auth Service is a microservice within the Tax Management System (TMS) that handles user authentication and authorization. It provides endpoints for user registration, login, and token management.

## Overview

The Auth Service is built with Node.js, TypeScript, MongoDB, and Redis. It follows RESTful API design principles and implements proper authentication and authorization using JWT and Redis for session management and TIN (Tax Identification Number) pools.

## Environment Variables

The service requires the following environment variables:

### Required Variables
- `DATABASE_URL`: MongoDB connection string
- `JWT_SECRET`: JWT signing secret
- `IO_REDIS_URL`: Redis connection URL (e.g., redis://localhost:6379)
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
- Sufficient memory for TIN pools
- Persistence configuration if needed

## Kafka Integration

The service integrates with Kafka for:
- User creation events
- Authentication events
- Session management events

Ensure Kafka is running and accessible via the configured broker URL.
