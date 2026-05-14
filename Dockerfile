# Stage 1: Build Angular
FROM node:22-alpine AS build
WORKDIR /app

# Cache npm dependencies
COPY package*.json ./
RUN npm ci --prefer-offline

# Build produzione
COPY . .
RUN npm run build:prod

# Stage 2: Serve con Nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

RUN rm -rf ./*

# Angular 17+ output in browser/ subfolder
COPY --from=build /app/dist/agostinelli/browser .

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
