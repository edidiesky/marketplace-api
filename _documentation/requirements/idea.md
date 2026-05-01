Marketplace Use Cases
Seller Onboarding

Register as individual or business seller
KYC verification
Store setup and branding
Bank account and payout configuration
Product catalogue setup

Product Management

Single product create/update/delete
Bulk product upload via feed/CSV
Product variants (size, color, SKU)
Price update (single and bulk)
Stock level update (single and bulk)
Product archiving and soft delete
Category and attribute mapping

Inventory

Stock reservation on checkout
Stock release on cancellation/expiry
Stock commit on payment success
Low stock alerts
Out of stock handling
Multi-warehouse stock allocation
Damaged/unsellable stock management

Discovery and Search

Full text product search
Filter by category, price, rating
Seller store page
Recommended products
Recently viewed

Cart and Checkout

Add/update/remove cart items
Apply coupon or discount code
Select delivery address
Select shipping method
Cart abandonment
Cart expiry and stock release

Payments

Payment initialization
Payment confirmation via webhook
Split payment (buyer pays, platform takes cut, seller gets remainder)
Failed payment retry
Pending payment timeout

Orders

Order creation on payment success
Order state machine (pending, confirmed, shipped, delivered, cancelled)
Order tracking
Seller order management
Platform order visibility

Shipping and Fulfillment

Shipping fee calculation
Label generation
Carrier integration
Shipment tracking updates
Failed delivery handling
Return pickup scheduling

Returns and Refunds

Full order return
Partial return (subset of items)
Proportional shipping fee deduction on partial return
Proportional VAT reclaim per returned item
Refund to original payment method
Refund to wallet/store credit
Restocking decision (resellable vs damaged)
Seller dispute on return

Financial and Ledger

Platform commission deduction per sale
Seller payout calculation
Payout scheduling (weekly, on-demand)
Refund liability accounting
Revenue reversal on return
VAT accounting per transaction
Double-entry ledger per event
Financial reconciliation report

Reviews and Ratings

Buyer reviews product after delivery
Seller rating
Review moderation
Fake review detection

Notifications

Order confirmation email
Shipping update SMS/push
Payment failure alert
Low stock alert to seller
Payout processed notification
Return status update

Seller Performance and SLA

Cancellation rate tracking
Shipping rate compliance
Response time SLA
Performance score computation
Fee adjustment based on performance
Account suspension triggers

Admin and Platform

Seller approval and suspension
Dispute resolution
Fraud detection
Fee configuration per category
Coupon and campaign management
Platform financial dashboard
Audit logs

Multi-channel (Advanced)

External marketplace sync (Amazon, Jumia, etc.)
Cross-channel stock sync per SKU
Feed-based bulk price update
Channel-specific pricing rules
Double sale detection and cancellation




Partial shipment with mixed fulfilled/cancelled items
Order has 5 items. 3 ship today, 2 are out of stock and auto-cancelled. The customer already paid with a gift card + promo. How do you prorate the refund to the right payment methods without double-charging or leaving orphaned credit?
Warehouse “ghost stock” during pick & pack
System says 1 unit left. Picker scans it, but it’s missing (stolen, damaged, or miscounted by previous shift). Order is already “packed” in the system. Do you fail the whole order, back-order the item, or let the shipment go short?
Split shipment + one package lost in transit
Two packages, separate carriers. Package A delivered → customer happy. Package B lost after 14 days. Do you auto-refund only B, re-send B, or mark the entire order as “partially complete” forever?
Coupon applied to order, then one item returned
$100 order with $20 coupon. Customer returns $30 item. How much of the coupon value do you give back? Pro-rata? Full? What if it was a “buy 2 get 1 free” that no longer qualifies after return?
Pre-order + live stock conflict
Customer pre-orders item that arrives later. Meanwhile, live stock from another warehouse becomes available. Do you fulfill from live stock and cancel the pre-order slot, or hold both?
International order with duties paid by customer at delivery
Customer pays duties on doorstep but claims the item was damaged. Carrier refuses refund. Who eats the duty cost? How does your system track “customer-paid duties” separately from product value?
Subscription pause + price change mid-pause
Customer pauses yearly subscription for 3 months. During pause, price increases. When they un-pause, do they pay old or new price? What if they had a grandfathered discount?
B2B net-30 order with partial delivery
Company orders 100 units on 30-day terms. You ship 60. Their ERP only accepts “complete” invoices. Do you invoice 60 now or wait until all 100 ship?
Gift card used on order that later gets charged back
Customer uses $50 gift card + credit card. Later the credit card charge is disputed and won by bank. Do you deduct from the gift card balance retroactively? What if the gift card was already spent elsewhere?
Flash sale ends while checkout is in progress
Customer adds last discounted item to cart, spends 8 minutes filling address/payment. Sale ends at minute 7. Do you honor the price or kick them back to full price mid-checkout?
Multi-warehouse allocation with carrier restrictions
Item exists in Warehouse A (cheap shipping) and B (expensive). System allocates from A, but carrier A won’t ship to that ZIP code. Do you re-allocate at packing time and eat the extra shipping cost?
Order with “ship to store” + customer never picks up
21 days later item is still at store. Do you auto-cancel and refund, or charge restocking + return shipping? What if it was a custom-engraved item?
Tax nexus changes mid-order
Customer checks out in State X (no nexus). By the time it ships, your company now has nexus in State X because of new warehouse. Do you retroactively charge tax?
Refund issued but item already resold
Customer returns item → you issue refund. Meanwhile another customer buys the returned item (now in “returned” inventory). First customer’s refund clears, second customer gets the item. Inventory count is now off by one.
Abandoned cart with applied store credit that expires
Customer abandons cart with $15 expiring store credit. They return 3 days later after credit expired. Do you honor the old credit amount?
Bundle product where one component goes out of stock
“Gaming PC bundle” (case + GPU + RAM). GPU goes OOS after order. Do you cancel entire bundle, split-ship the rest, or hold the whole order?
High-value order flagged for manual fraud review after label created
Label is printed and handed to carrier. Fraud team then flags it. Too late to cancel. Now you’re chasing a $2k order that might be stolen.
VAT reverse charge for B2B EU order
Customer provides valid EU VAT number. You ship. Later they claim they never received the invoice with reverse-charge text. Tax authority fines you. How do you prove you captured the VAT number at checkout time?
Loyalty points issued on order that later gets partial refund
Customer earns 500 points on $200 order. Returns $80 item. Do you claw back 200 points? What if they already spent the points on another order?
Same-day delivery cutoff missed due to inventory sync lag
Customer selects “same-day” at 3:59 pm. At 4:01 pm warehouse sync reveals item is damaged. Order is already promised. Do you auto-downgrade to next-day and notify, or eat the rush delivery cost yourself?
