# Tenant Service (SellEasi)
This service is totally isolated from the other service within Selleasi. I built it with a thought for scalability, decentralization for users who wishes to kick start their business easily.

The tenant service owns feature like tenant lifecycle, plan enforcement, quota limits, and data isolation.

![Project Screenshot](/architecture/Onboarding%20Process%201.png)

## Repo Location
```bash
SELLEASI-ARCHITECTURE/
└── tenant/
    ├── src/
    │   ├── controllers/
    │   ├── __tests__/ 
    │       │─────── unit/
    │       │─────── integration/
    │   ├── services/
    │   ├── repository/
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



## Core Responsibilities
1. Async creation of tenants via User onboarding
2. Diverse Plan & Quota Enforcement (FREE, PRO, ENTERPRISE limits)
3. Every record ahs a unique data isolation (tenantId)
4. Soft delete and recovery implementation 
5. Role based access control and Permissions by Tenant Type


## Model
```javascript
export interface ITenant extends Document {
  tenantId: string;          
  ownerId: Types.ObjectId; 
  ownerEmail: string;
  type: TenantType;
  status: TenantStatus;
  billingPlan: BillingPlan;
  trialEndsAt?: Date;
  currentPeriodEndsAt?: Date;
  limits: {
    stores: number;
    products: number;
    teamMembers: number;
    apiCallsPerMonth: number;
  };
  metadata: Record<string, any>;
  deletedAt?: Date;
}
```


### ROUTES

| Method | Endpoint                                        | Description                  |
| ------ | ---------------------------------------         | -------------------------    | 
| POST   | `/api/v1/tenants`                               | Create Tenant                |
| GET    | `/api/v1/tenants?page=""&limit=""&search=""`    | Get Tenants                  |
| POST   | `/api/v1/tenants/:tenantId/ban`                 | Ban Single Tenant            |
| POST   | `/api/v1/tenants/:tenantId/unban`               | Unban Single Tenant          |
| GET    | `/api/v1/tenants/:tenantId`                     | Get Single Tenant            |
| DELETE | `/api/v1/tenants/:tenantId`                     | Delete Single Tenant         |

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
