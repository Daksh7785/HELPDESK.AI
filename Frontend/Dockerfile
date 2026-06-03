# =============================================================================
# Multi-stage Dockerfile for HELPDESK.AI Frontend (Vite + nginx)
# Stage 1 (builder): Build the Vite/React application
# Stage 2 (production): Serve via nginx:alpine
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: builder — install deps and compile Vite production bundle
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /build

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build


# ---------------------------------------------------------------------------
# Stage 2: production — serve static files via nginx
# ---------------------------------------------------------------------------
FROM nginx:stable-alpine AS production

LABEL maintainer="HELPDESK.AI Team" \
      version="2.0.0" \
      description="AI Helpdesk — frontend production image"

COPY --from=builder /build/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["wget", "--spider", "-q", "http://localhost:80/"]

CMD ["nginx", "-g", "daemon off;"]
