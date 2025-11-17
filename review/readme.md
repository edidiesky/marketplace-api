# Review Service (SellEasi)
This service is totally isolated from the other service within Selleasi. I built it with a thought for scalability, decentralization for users who wishes to kick start their business easily.

The review service owns feature like review lifecycle, plan enforcement, quota limits, and data isolation.

![Project Screenshot](/architecture/Onboarding%20Process%201.png)

## Repo Location
```bash
SELLEASI-ARCHITECTURE/
└── review/
    ├── src/
    │   ├── controllers/
    │   ├── __tests__/ 
    │       │─────── unit/
    │       │─────── integration/
    │   ├── services/
    │   ├── repositories/
    │       │─────── IReviewRepository.ts
    │       │─────── ReviewRepository.ts
    │   ├── models/
    │   ├── types/
    │   ├── config/
    │   ├── validators/
    │   ├── route/
    │   └── middleware/
    ├── tests/
    ├── Dockerfile
    ├── package.json
    └── README.md
```



## Core Responsibilities acheive by this Service
1. Async creation of tenants via User onboarding
2. Diverse Plan & Quota Enforcement (FREE, PRO, ENTERPRISE limits)
3. Every record ahs a unique data isolation (tenantId)
4. Soft delete and recovery implementation 
5. Role based access control and Permissions by Review Type


## Review Model
```javascript
export interface IReview extends Document {
  _id: Types.ObjectId;

  // Core Relations
  productId: Types.ObjectId;
  storeId: Types.ObjectId;
  userId: Types.ObjectId;
  orderId: Types.ObjectId;

  productTitle: string;
  productImage?: string;
  storeName: string;
  storeLogo?: string;
  reviewerName: string;
  reviewerImage?: string;

  // Review Content
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  comment: string;
  images?: string[];

  // Verification & Moderation
  isVerifiedPurchase: boolean;
  status: ReviewStatus;
  moderatedBy?: Types.ObjectId;
  moderatedAt?: Date;

  // Engagement
  helpfulCount: number;
  unhelpfulCount: number;
  reportCount: number;

  // Store Response
  response?: {
    text: string;
    respondedBy: Types.ObjectId;
    respondedAt: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}
```


### ROUTES

| Method | Endpoint                                        | Description                  |
| ------ | ---------------------------------------         | -------------------------    | 
| POST   | `/api/v1/reviews`                               | Submit Review                |
| POST   | `/api/v1/reviews/:id/respond`                   | Store owner leaving a reply  |
| POST   | `/api/v1/reviews/:id/helpful`                   | Mark reply as helpful/unhelpful |
| GET    | `/api/v1/reviews/:productId/product`            | Get Product Reviews            |
| GET    | `/api/v1/reviews/:storeId/store`                | Get Store Reviews              |
| DELETE | `/api/v1/reviews/:tenantId`                     | Delete Single Review         |

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
