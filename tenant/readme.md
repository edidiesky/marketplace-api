# Tenant Service (SellEasi)
This service is totally isolated from the other service within Selleasi. I built it with a thought for scalability, decentralization for users who wishes to kick start their business easily.

The tenant service owns feature like tenant lifecycle, plan enforcement, quota limits, and data isolation.

![Project Screenshot](/architecture/Onboarding%20Process%201.png)
![Project Screenshot](/architecture/Payment%20Workflow.png)
![Audit Workflow](/architecture/Payment_Audit_Workflow.png)

# Repo Location
```bash
SELLEASI-ARCHITECTURE/
└── tenant/
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



### Core Responsibilities
1. Async creation of tenants via User onboarding
2. Diverse Plan & Quota Enforcement (FREE, PRO, ENTERPRISE limits)
3. Every record ahs a unique data isolation (tenantId)
4. Soft delete and recovery implementation 
5. Role based access control and Permissions by Tenant Type


## Models
### Tenant Model
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
```javascript
router
  .route("/")
  .post(
    authenticate,
    validateRequest(tenantSchema),
    CreateTenantHandler
  )
  .get(authenticate, GetAllTenantHandler);

router
  .route("/:id")
  .get(authenticate, GetSingleTenantHandler)
  .put(authenticate, UpdateTenantHandler)
  .delete(authenticate, DeleteTenantHandler);
```