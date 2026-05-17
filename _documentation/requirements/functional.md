Functional Requirements
Authentication and Onboarding

User submits email and password in one step
System sends email verification link with 24-hour expiry
User verifies email then proceeds to profile details
User selects userType (SELLER or CUSTOMER)
System creates user record with status DRAFT
For sellers: organization onboarding saga triggers automatically
Organization service creates organization and publishes completion event
Subscription service creates FREE trial subscription on org completion
Authentication service patches user status to ACTIVE on saga completion
User can login only after status is ACTIVE
Login requires email and password then issues 2FA OTP via SMS or email
2FA OTP expires in 15 minutes
Successful 2FA issues JWT (15 min) and refresh token (7 days)
Refresh token rotation on every use
Logout blocklists the access token for its remaining TTL

Store Management

Seller can create a store (gated by subscription maxStores)
Store name generates a suggested subdomain automatically
Subdomain must be unique, URL-safe, 3-63 characters
On store creation Caddy registers the subdomain route
Seller can update store name, description, logo, banner, settings
Seller can add a custom domain (verification flow required)
Seller can suspend their own store
Platform admin can suspend any store

Product Management

Seller can create a product with title, description, price, images
Product can have multiple variants combining color and size
Each variant has its own SKU, price override, and inventory record
Seller can set products to draft (not visible to customers) or active
Seller can archive products (hidden from store, orders preserved)
Product creation publishes event that creates inventory record
Product creation publishes event for Elasticsearch sync
Seller can bulk update product status
Product images stored via upload URL, not base64

Inventory Management

Every product variant has an inventory record created automatically
Inventory tracks onHand, available, reserved with MVCC version
Seller can adjust onHand stock manually (increases or decreases)
Manual adjustment publishes inventory adjustment event to audit log
Available count is real-time: reservation reduces it immediately
Release (on payment failure or cart expiry) restores it immediately
Low stock alert fires when available falls below lowStockThreshold
Seller can set trackInventory false for unlimited stock items
Real-time available count exposed via API for product display

Cart

Authenticated customers only, no guest cart
One cart per customer per store
Customer can add, update quantity, remove items
Adding an item checks available inventory in real time
Cart displays current price and flags if price changed since adding
Cart expires after 7 days of inactivity
Cart locks when checkout begins preventing modification
Cart unlocks if payment fails
Cart converts to order on payment success

Checkout and Orders

Customer initiates checkout from locked cart
System validates all items still available before proceeding
Inventory reservation attempted for all items atomically
If any item cannot be reserved the checkout fails with specific items flagged
Customer provides or confirms shipping address
Customer can apply Selleasi credits before payment
Remaining amount after credits goes to payment provider
If credits cover full amount no payment provider call is made
Order record created when checkout starts with status pending_inventory
Order status advances through saga states via events only
Customer receives email notification on each status change
Seller receives email notification on new order and fulfillment required

Payment

Payment provider abstracted behind an interface (Paystack at MVP)
Idempotency key generated per payment attempt
Duplicate payment attempt with same key returns existing result
Payment failure releases inventory reservation and unlocks cart
Payment success commits inventory reservation and converts cart
Seller sees payment status on order detail

Credit System

Platform can issue credits to any user
Credits have optional expiry
Credits are applied at checkout before payment
Partial credit application supported (credit reduces total, remainder charged)
Credit balance displayed in customer account
Credit usage recorded against the order

Subscription and Billing

New seller organizations start on FREE trial for 7 days
Trial converts to FREE plan on expiry unless upgraded
Seller can upgrade plan via subscription endpoint
Feature gates enforced at API level not just UI
Subscription status checked on store creation and product creation

Search and Discovery

Customer can search products across all active stores
Customer can filter by category, price range, rating
Customer can browse a specific store by subdomain
Product views tracked per product
Search powered by Elasticsearch with products indexed on create and update

Reviews

Customer can review a product only after order is delivered
One review per customer per product per order
Rating is 1 to 5
Average rating computed and cached in Redis per product
Seller cannot delete customer reviews (platform admin can)

Notifications

All notifications are event-driven via RabbitMQ
Email via configurable provider (Resend at MVP)
SMS via configurable provider (Termii at MVP)
Notification record created for every send attempt
Idempotency via notificationId prevents duplicate sends on retry

Audit

Every write operation across all services publishes an audit event
Audit log retained for 90 days on FREE, 1 year on PRO and ENTERPRISE
Platform admin can query audit log by user, organization, or resource


Explicit MVP Exclusions
Guest checkout              No. Authentication required.
OAuth / social login        No. Email and password only.
Swap / crypto payments      No. Fiat only via Paystack.
Multi-currency checkout     No. Store currency is fixed at creation.
Seller payouts              No. Payment received, payout is post-MVP.
Affiliate system            No. Post-MVP.
Discount codes              No. Credits only at MVP.
Abandoned cart recovery     No. Cart expires, no recovery email at MVP.
Seller mobile app           No. Web only at MVP.
Physical POS integration    No. Online only.
B2B bulk ordering           No. Single unit checkout at MVP.
Product bundles             No. Single products and variants only.
Subscription products       No. One-time purchase only at MVP.
Digital product delivery    No. Physical goods with shipping only.
Multi-currency support      No. Single currency per store.
Seller analytics dashboard  No. Basic order count only at MVP.
