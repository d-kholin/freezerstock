FROM node:20-alpine AS builder

WORKDIR /app

# vips is the native image processing lib required by sharp
RUN apk add --no-cache vips-dev python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .

# build script runs generate-icons then tsc + vite
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
