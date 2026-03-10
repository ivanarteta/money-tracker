FROM node:20-slim AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias (incl. devDependencies para el build)
RUN npm ci

# Asegurar binario nativo de Rollup para linux/amd64 (npm optional deps bug en Docker)
RUN npm install @rollup/rollup-linux-x64-gnu@4.55.2 --no-save

# Copiar código fuente
COPY . .

# URL de la API en producción (misma origen, nginx hace proxy de /api al backend)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

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
