#!/bin/bash

# =============================================================
# Selleasi .env generator
# Run from the monorepo root where all service folders live
# Usage: chmod +x generate-envs.sh && ./generate-envs.sh
# =============================================================

# -------------------------------------------------------
# SHARED SECRETS - change these before running
# -------------------------------------------------------
JWT_CODE="your_jwt_secret_min_32_chars"
INTERNAL_SECRET="your_internal_secret_min_32_chars"
RABBITMQ_URL="amqp://selleasi:your_rabbit_password@localhost:5672"
REDIS_URL="redis://:your_redis_password@localhost:6379"
WEB_ORIGIN="http://localhost:3000"
OTEL_ENDPOINT="http://localhost:4318"
MONGO_BASE="mongodb://localhost:27017"

# -------------------------------------------------------
# THIRD PARTY CREDENTIALS - fill these in
# -------------------------------------------------------
TWILIO_ACCOUNT_SID="your_twilio_account_sid"
TWILIO_AUTH_TOKEN="your_twilio_auth_token"
SMS_FROM_NUMBER="+1234567890"

RESEND_API_KEY="re_your_resend_api_key"
EMAIL_FROM="Selleasi <no-reply@selleasi.com>"

PAYSTACK_SECRET_KEY="sk_test_your_paystack_secret_key"
FLW_SECRET_KEY="FLWSECK_TEST-your_flutterwave_secret_key"
PLATFORM_FEE_RATE="0.05"

CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
CLOUDINARY_API_KEY="your_cloudinary_api_key"
CLOUDINARY_API_SECRET="your_cloudinary_api_secret"

ELASTICSEARCH_URL="http://localhost:9200"
ELASTICSEARCH_USERNAME="elastic"
ELASTICSEARCH_PASSWORD="your_elasticsearch_password"

CADDY_ADMIN_URL="http://localhost:2019"
CADDY_BASE_DOMAIN="selleasi.com"

# -------------------------------------------------------
# HELPER
# -------------------------------------------------------
write_env() {
  local SERVICE_DIR=$1
  local ENV_CONTENT=$2

  if [ ! -d "$SERVICE_DIR" ]; then
    echo "SKIPPED: $SERVICE_DIR does not exist"
    return
  fi

  echo "$ENV_CONTENT" > "$SERVICE_DIR/.env"
  echo "WRITTEN: $SERVICE_DIR/.env"
}

# -------------------------------------------------------
# authentication-service
# -------------------------------------------------------
write_env "authentication-service" "PORT=4001
NODE_ENV=development

DATABASE_URL=${MONGO_BASE}/selleasi-auth
REDIS_URL=${REDIS_URL}
RABBITMQ_URL=${RABBITMQ_URL}

JWT_CODE=${JWT_CODE}
JWT_EXPIRES_IN=7d

INTERNAL_SECRET=${INTERNAL_SECRET}
WEB_ORIGIN=${WEB_ORIGIN}

TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
SMS_FROM_NUMBER=${SMS_FROM_NUMBER}

OTEL_EXPORTER_OTLP_ENDPOINT=${OTEL_ENDPOINT}"

# -------------------------------------------------------
# organization-service
# -------------------------------------------------------
write_env "organization-service" "PORT=4010
NODE_ENV=development

DATABASE_URL=${MONGO_BASE}/selleasi-organization
REDIS_URL=${REDIS_URL}
RABBITMQ_URL=${RABBITMQ_URL}

INTERNAL_SECRET=${INTERNAL_SECRET}
WEB_ORIGIN=${WEB_ORIGIN}

OTEL_EXPORTER_OTLP_ENDPOINT=${OTEL_ENDPOINT}"

# -------------------------------------------------------
# subscription-service
# -------------------------------------------------------
write_env "subscription-service" "PORT=4017
NODE_ENV=development

DATABASE_URL=${MONGO_BASE}/selleasi-subscription
REDIS_URL=${REDIS_URL}
RABBITMQ_URL=${RABBITMQ_URL}

INTERNAL_SECRET=${INTERNAL_SECRET}
WEB_ORIGIN=${WEB_ORIGIN}

OTEL_EXPORTER_OTLP_ENDPOINT=${OTEL_ENDPOINT}"

# -------------------------------------------------------
# stores-service
# -------------------------------------------------------
write_env "stores-service" "PORT=4007
NODE_ENV=development

DATABASE_URL=${MONGO_BASE}/selleasi-stores
REDIS_URL=${REDIS_URL}
RABBITMQ_URL=${RABBITMQ_URL}

INTERNAL_SECRET=${INTERNAL_SECRET}
WEB_ORIGIN=${WEB_ORIGIN}

CADDY_ADMIN_URL=${CADDY_ADMIN_URL}
CADDY_BASE_DOMAIN=${CADDY_BASE_DOMAIN}

OTEL_EXPORTER_OTLP_ENDPOINT=${OTEL_ENDPOINT}"

# -------------------------------------------------------
# products-service
# -------------------------------------------------------
write_env "products-service" "PORT=4003
NODE_ENV=development

DATABASE_URL=${MONGO_BASE}/selleasi-products
REDIS_URL=${REDIS_URL}
RABBITMQ_URL=${RABBITMQ_URL}

ELASTICSEARCH_URL=${ELASTICSEARCH_URL}
ELASTICSEARCH_USERNAME=${ELASTICSEARCH_USERNAME}
ELASTICSEARCH_PASSWORD=${ELASTICSEARCH_PASSWORD}

INTERNAL_SECRET=${INTERNAL_SECRET}
WEB_ORIGIN=${WEB_ORIGIN}

OTEL_EXPORTER_OTLP_ENDPOINT=${OTEL_ENDPOINT}"

# -------------------------------------------------------
# inventory-service
# -------------------------------------------------------
write_env "inventory-service" "PORT=4008
NODE_ENV=development

DATABASE_URL=${MONGO_BASE}/selleasi-inventory
REDIS_URL=${REDIS_URL}
RABBITMQ_URL=${RABBITMQ_URL}

INTERNAL_SECRET=${INTERNAL_SECRET}
WEB_ORIGIN=${WEB_ORIGIN}

OTEL_EXPORTER_OTLP_ENDPOINT=${OTEL_ENDPOINT}"

# -------------------------------------------------------
# cart-service
# -------------------------------------------------------
write_env "cart-service" "PORT=4009
NODE_ENV=development

DATABASE_URL=${MONGO_BASE}/selleasi-cart
REDIS_URL=${REDIS_URL}
RABBITMQ_URL=${RABBITMQ_URL}

INTERNAL_SECRET=${INTERNAL_SECRET}
WEB_ORIGIN=${WEB_ORIGIN}

OTEL_EXPORTER_OTLP_ENDPOINT=${OTEL_ENDPOINT}"

# -------------------------------------------------------
# orders-service
# -------------------------------------------------------
write_env "orders-service" "PORT=4012
NODE_ENV=development

DATABASE_URL=${MONGO_BASE}/selleasi-orders
REDIS_URL=${REDIS_URL}
RABBITMQ_URL=${RABBITMQ_URL}

CART_SERVICE_URL=http://localhost:4009
INVENTORY_SERVICE_URL=http://localhost:4008

INTERNAL_SECRET=${INTERNAL_SECRET}
WEB_ORIGIN=${WEB_ORIGIN}

CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}
CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET}

OTEL_EXPORTER_OTLP_ENDPOINT=${OTEL_ENDPOINT}"

# -------------------------------------------------------
# payment-service
# -------------------------------------------------------
write_env "payment-service" "PORT=4004
NODE_ENV=development

DATABASE_URL=${MONGO_BASE}/selleasi-payment
REDIS_URL=${REDIS_URL}
RABBITMQ_URL=${RABBITMQ_URL}

ORDER_SERVICE_URL=http://localhost:4012

PAYSTACK_SECRET_KEY=${PAYSTACK_SECRET_KEY}
FLW_SECRET_KEY=${FLW_SECRET_KEY}
PLATFORM_FEE_RATE=${PLATFORM_FEE_RATE}

INTERNAL_SECRET=${INTERNAL_SECRET}
WEB_ORIGIN=${WEB_ORIGIN}

OTEL_EXPORTER_OTLP_ENDPOINT=${OTEL_ENDPOINT}"

# -------------------------------------------------------
# notification-service
# -------------------------------------------------------
write_env "notification-service" "PORT=4006
NODE_ENV=development

DATABASE_URL=${MONGO_BASE}/selleasi-notification
REDIS_URL=${REDIS_URL}
RABBITMQ_URL=${RABBITMQ_URL}

RESEND_API_KEY=${RESEND_API_KEY}
EMAIL_FROM=${EMAIL_FROM}

TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
SMS_FROM_NUMBER=${SMS_FROM_NUMBER}

INTERNAL_SECRET=${INTERNAL_SECRET}
WEB_ORIGIN=${WEB_ORIGIN}

OTEL_EXPORTER_OTLP_ENDPOINT=${OTEL_ENDPOINT}"

# -------------------------------------------------------
# api-gateway
# -------------------------------------------------------
write_env "api-gateway" "PORT=8000
NODE_ENV=development

REDIS_URL=${REDIS_URL}

AUTH_SERVICE_URL=http://localhost:4001
ORGANIZATION_SERVICE_URL=http://localhost:4010
SUBSCRIPTION_SERVICE_URL=http://localhost:4017
STORES_SERVICE_URL=http://localhost:4007
PRODUCTS_SERVICE_URL=http://localhost:4003
INVENTORY_SERVICE_URL=http://localhost:4008
CART_SERVICE_URL=http://localhost:4009
ORDERS_SERVICE_URL=http://localhost:4012
PAYMENT_SERVICE_URL=http://localhost:4004
NOTIFICATION_SERVICE_URL=http://localhost:4006
REVIEW_SERVICE_URL=http://localhost:4011
AUDIT_SERVICE_URL=http://localhost:4002
ESCROW_SERVICE_URL=http://localhost:4018
USERS_SERVICE_URL=http://localhost:4016

JWT_CODE=${JWT_CODE}

INTERNAL_SECRET=${INTERNAL_SECRET}
WEB_ORIGIN=${WEB_ORIGIN}

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

OTEL_EXPORTER_OTLP_ENDPOINT=${OTEL_ENDPOINT}"

echo ""
echo "Done. All .env files written."
echo ""
echo "IMPORTANT: Before committing, make sure .env is in your .gitignore."
echo "Run: echo '.env' >> .gitignore"