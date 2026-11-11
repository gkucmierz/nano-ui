# Stage 1: Build the application playground
FROM node:lts-alpine as build-stage

WORKDIR /app

# Install git system dependency explicitly missing from Alpine Core so NPM can resolve git origins
RUN apk add --no-cache git

COPY package*.json .npmrc* ./
RUN npm install --legacy-peer-deps

COPY . .

# Build the playground app using the separate config
RUN npm run build:ssg

# Stage 2: Serve the application with Nginx
FROM nginx:stable-alpine as production-stage

COPY --from=build-stage /app/dist-ssg /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
