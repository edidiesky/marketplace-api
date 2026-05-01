FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

# Use a minimal image just to hold the built files
FROM alpine:3.19

WORKDIR /srv/ui

COPY --from=builder /app/dist .