FROM node:20-alpine AS builder

WORKDIR /app

# Dépendances
COPY package.json ./
RUN npm install

# Build
COPY . .
RUN npm run build

# --- Image finale Nginx ---
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
