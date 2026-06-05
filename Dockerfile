# === STAGE 1: Compilation/Build Engine ===
FROM node:lts-alpine AS builder
WORKDIR /app

# Copy dependency mappings and install the compilation packages
COPY package.json astro.config.mjs ./
RUN npm install

# Copy the actual code/markup source directories
COPY src/ ./src/
COPY public ./public

# Run the compilation script. This outputs raw production assets to /app/dist
RUN npm run build

# === STAGE 2: High-Performance Production Web Server ===
FROM nginx:alpine


# Copy the compiled HTML/CSS assets from the builder stage straight to Nginx
COPY --from=builder /app/dist /usr/share/nginx/html


# Drop in custom Nginx routing to cleanly handle clean/extensionless URLs
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ $uri.html =404; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
