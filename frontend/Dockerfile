FROM node:20-bullseye-slim AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json package-lock.json ./

# Instalar dependencias
RUN npm install --include=optional --no-audit --no-fund

# Copiar código fuente
COPY . .

# Construir la aplicación
RUN npm run build

# Etapa de producción con nginx
FROM nginx:alpine

# Copiar los archivos construidos
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
