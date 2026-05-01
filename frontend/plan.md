# Selleasi Frontend: Routing & Architecture Plan
J
> **Stack:** React, TypeScript, Redux Toolkit, RTK Query, TailwindCSS, React Router v6

---

## 1. User Types & Entry Points

| User Type | Post-Login Destination | Notes |
|---|---|---|
| `GUEST` | `/` (home) or `/store/:storeId` | No auth required for browsing |
| `BUYER` | Redirected back to `/store/:storeId` they came from | Falls back to `/` if no prior store |
| `SELLER` | `/dashboard/store/:storeId` | Redirected to store creation if no store exists |
| `ADMIN` | `/admin` | Fully separate layout |

---

## 2. Route Tree (Modular Structure)

```
src/
  routes/
    index.tsx              ← Root router, composes all route groups
    guestRoutes.tsx        ← Public routes (no auth)
    authRoutes.tsx         ← Auth flow routes (register, login, onboarding)
    storeRoutes.tsx        ← Buyer-facing store routes
    dashboardRoutes.tsx    ← Seller dashboard routes
    adminRoutes.tsx        ← Admin routes (future, scaffold only now)
    guards/
      ProtectRoute.tsx     ← Auth + role guard
      GuestOnlyRoute.tsx   ← Redirect authenticated users away from auth pages
      RedirectByRole.tsx   ← Post-login redirect logic by userType
```

---

## 3. Route Definitions

### 3.1 Guest / Public Routes (`guestRoutes.tsx`)

| Path | Component | Description |
|---|---|---|
| `/` | `<Home />` | Landing page, visible to all |
| `*` | `<NotFound />` | 404 fallback |
| `/unauthorized` | `<Unauthorized />` | Role mismatch screen |

**Layout:** `MainLayout` (navbar + footer)

---

### 3.2 Auth Routes (`authRoutes.tsx`)

All wrapped in `GuestOnlyRoute` - authenticated users are redirected away.

| Path | Component | Action |
|---|---|---|
| `/login` | `<Login />` | `loginMutation` → OTP screen |
| `/verify-otp` | `<VerifyOtp />` | `verifyOtpMutation` → `RedirectByRole` |
| `/register` | `<Register />` | `registerMutation` (name, email, userType) |
| `/onboarding` | `<Onboarding />` | Multi-step wizard (5 steps, see below) |
| `/reset-password` | `<ResetPassword />` | `requestResetMutation` |
| `/reset-password/:token` | `<NewPassword />` | `passwordResetMutation` |

**Layout:** Split-panel layout (brand left, form right) — matches your sample code pattern.

#### Onboarding Wizard Steps (SELLER only)

```
Step 1: Email entry          → POST /auth/onboarding/email
Step 2: OTP verification     → POST /auth/verify-2fa
Step 3: Password creation    → POST /auth/onboarding/password
Step 4: Personal details     → (local state, submitted at step 5)
Step 5: Create store         → POST /stores (name, subdomain, description)
         ↓
   → /dashboard/store/:newStoreId
```

**State management:** All step data lives in a single `useReducer` inside `<Onboarding />`. Nothing in Redux until the store is created and tokens are issued.

**Component structure:**

```
Onboarding/
  index.tsx           ← Wizard shell (step state, progress bar, nav buttons)
  steps/
    StepEmail.tsx
    StepOtp.tsx
    StepPassword.tsx
    StepDetails.tsx
    StepCreateStore.tsx
  hooks/
    useOnboarding.ts  ← All mutation calls + step transition logic
```

---

### 3.3 Store Routes - Buyer Facing (`storeRoutes.tsx`)

Wrapped in `MainLayout`. Guest users can access all of these.

| Path | Component | Auth Required | Action |
|---|---|---|---|
| `/store/:storeId` | `<StoreListing />` | No | `useSearchProductsQuery` |
| `/store/:storeId/product/:productId` | `<SingleProduct />` | No | `useGetProductQuery` |
| `/store/:storeId/cart/:cartId` | `<Cart />` | Yes (BUYER) | `useGetCartQuery`, `useCheckoutMutation` |
| `/store/:storeId/reviews/:productId` | `<Reviews />` | No | `useGetReviewsQuery` |

**Note:** Cart and checkout require `BUYER` auth. Hitting those routes as guest redirects to `/login` with `state.from` preserved for post-login redirect.

---

### 3.4 Seller Dashboard Routes (`dashboardRoutes.tsx`)

All routes require `SELLER` role. Layout: `DashboardLayout` (sidebar + topbar).

| Path | Component | Primary Query/Mutation |
|---|---|---|
| `/dashboard/store/:storeId` | `<DashboardHome />` | Stats overview |
| `/dashboard/store/:storeId/products` | `<Products />` | `useGetProductsQuery` |
| `/dashboard/store/:storeId/orders` | `<Orders />` | `useGetOrdersQuery` |
| `/dashboard/store/:storeId/inventory` | `<Inventory />` | `useGetInventoryQuery` |
| `/dashboard/store/:storeId/customers` | `<Customers />` | `useGetUsersQuery` |
| `/dashboard/store/:storeId/analytics` | `<Analytics />` | `useGetPaymentHistoryQuery` |
| `/dashboard/store/:storeId/messages` | `<Messages />` | `useGetConversationsQuery` |
| `/dashboard/store/:storeId/marketing` | `<Marketing />` | TBD |
| `/dashboard/store/:storeId/categories` | `<Categories />` | `useGetCategoriesQuery` |
| `/dashboard/store/:storeId/colors` | `<Colors />` | `useGetColorsQuery` |
| `/dashboard/store/:storeId/sizes` | `<Sizes />` | `useGetSizesQuery` |
| `/dashboard/store/:storeId/account` | `<Account />` | `useGetMeQuery` |
| `/dashboard/store/:storeId/payouts` | `<Payouts />` | `useGetWalletQuery` |

---

### 3.5 Admin Routes (`adminRoutes.tsx`)

Scaffold only. Requires `ADMIN` role.

| Path | Component | Notes |
|---|---|---|
| `/admin` | `<AdminHome />` | Overview |
| `/admin/users` | `<AdminUsers />` | All users |
| `/admin/stores` | `<AdminStores />` | All stores |
| `/admin/orders` | `<AdminOrders />` | Platform-wide orders |
| `/admin/payouts` | `<AdminPayouts />` | Approve/reject payouts |

---

## 4. Guards

### `ProtectRoute.tsx`
```
props: allowedRoles?: UserType[]
- No token → redirect to /login with state.from
- Wrong role → redirect to /unauthorized
- Pass → render children
```

### `GuestOnlyRoute.tsx`
```
- Has token → RedirectByRole()
- No token → render children
```

### `RedirectByRole.tsx`
```
BUYER  → state.from ?? "/"
SELLER → /dashboard/store/:firstStoreId  (or /onboarding if no store)
ADMIN  → /admin
GUEST  → /
```

---

## 5. Root Router Composition (`routes/index.tsx`)

```tsx
<Routes>
  {guestRoutes}      // /, /unauthorized, *
  {authRoutes}       // /login, /register, /onboarding, /verify-otp
  {storeRoutes}      // /store/:storeId/*
  {dashboardRoutes}  // /dashboard/store/:storeId/*
  {adminRoutes}      // /admin/*
</Routes>
```

Each route file exports a `<Route>` fragment, composed here. No route logic lives in `App.tsx` directly.

---

## 6. What Changes in App.tsx

`App.tsx` becomes a thin shell:

```tsx
import { RouterProvider } from "react-router-dom";
import { router } from "@/routes";

export default function App() {
  return <RouterProvider router={router} />;
}
```

All route definitions move to `src/routes/`.

---

## 7. Execution Order (Day-by-Day)

### Day 1
- [ ] Modularize routes (extract all route groups)
- [ ] Implement `ProtectRoute`, `GuestOnlyRoute`, `RedirectByRole`
- [ ] Build `Onboarding` wizard (5 steps, wire all mutations)
- [ ] Build `Login` + `VerifyOtp` screens

### Day 2
- [ ] Seller Dashboard layout (`DashboardLayout` sidebar + topbar)
- [ ] `DashboardHome` (stats widgets)
- [ ] `Products` (table + create/edit modal)
- [ ] `Orders` (table + fulfillment update)
- [ ] `Inventory` (linked to products)

### Day 3
- [ ] `Analytics`, `Customers`, `Account`, `Payouts`
- [ ] Store buyer flow polish (`StoreListing`, `SingleProduct`, `Cart`)
- [ ] Admin scaffold (layout + 2 screens)
- [ ] Global error middleware wire-up
- [ ] End-to-end smoke test per user type

---

## 8. Open Decisions (Need Your Input)

1. **React Router v6 `createBrowserRouter` vs `<Routes>`** - do you want to migrate to the data router API (enables loaders/actions) or stay on `<Routes>`?
2. **Onboarding step 5 (Create Store)** - after store creation, does the SELLER need to add at least one product before accessing the dashboard, or can they enter immediately?
3. **Multiple stores per seller** - your route uses `:storeId`. If a seller has multiple stores, how do they switch? A store selector on login, or a switcher inside the dashboard?
4. **Admin dashboard** - full build now or scaffold + 2 screens only?

---

> **Next step:** Approve this plan or request changes. Once approved, I will start with `src/routes/` modularization and the guard components.