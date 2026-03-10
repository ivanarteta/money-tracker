# Despliegue con imágenes en Docker Hub

## Resumen de Dockerfiles

- **backend/Dockerfile**: Node 20 Alpine, `npm ci --omit=dev`, arranque con `npm run start`. Incluye migración en el `command` del compose.
- **frontend/Dockerfile**: Multi-stage: builder con Node (Vite build con `VITE_API_URL=/api`) y etapa final con nginx:alpine.
- **proxy/Dockerfile**: nginx:alpine + openssl, entrypoint que crea certificado autofirmado si no existe y arranca nginx.

Están listos para producción. En el servidor se usan las imágenes publicadas en Docker Hub (sin construir allí).

---

## 1. Build y push desde tu máquina

Sustituye `YOUR_DOCKERHUB_USER` por tu usuario de Docker Hub.

```bash
# Login en Docker Hub (una vez)
docker login

# Backend
docker build -t YOUR_DOCKERHUB_USER/money-tracker-backend:latest ./backend
docker push YOUR_DOCKERHUB_USER/money-tracker-backend:latest

# Frontend
docker build -t YOUR_DOCKERHUB_USER/money-tracker-frontend:latest ./frontend
docker push YOUR_DOCKERHUB_USER/money-tracker-frontend:latest

# Proxy
docker build -t YOUR_DOCKERHUB_USER/money-tracker-proxy:latest ./proxy
docker push YOUR_DOCKERHUB_USER/money-tracker-proxy:latest
```

Con tags por versión (recomendado):

```bash
export VERSION=1.0.0
export USER=YOUR_DOCKERHUB_USER

docker build -t $USER/money-tracker-backend:$VERSION -t $USER/money-tracker-backend:latest ./backend
docker build -t $USER/money-tracker-frontend:$VERSION -t $USER/money-tracker-frontend:latest ./frontend
docker build -t $USER/money-tracker-proxy:$VERSION -t $USER/money-tracker-proxy:latest ./proxy

docker push $USER/money-tracker-backend:$VERSION
docker push $USER/money-tracker-backend:latest
docker push $USER/money-tracker-frontend:$VERSION
docker push $USER/money-tracker-frontend:latest
docker push $USER/money-tracker-proxy:$VERSION
docker push $USER/money-tracker-proxy:latest
```

---

## 2. En el servidor

1. Crea un directorio (ej. `money-tracker`) y copia:
   - `docker-compose.hub.yml`
   - `.env` con las variables necesarias (o configúralas en el host).

2. En `docker-compose.hub.yml` sustituye **todas** las apariciones de `YOUR_DOCKERHUB_USER` por tu usuario de Docker Hub.

3. Si las imágenes son privadas, en el servidor:
   ```bash
   docker login
   ```

4. Descargar y levantar:
   ```bash
   docker compose -f docker-compose.hub.yml pull
   docker compose -f docker-compose.hub.yml up -d
   ```

5. Certificado SSL (primera vez):
   ```bash
   docker compose -f docker-compose.hub.yml run --rm certbot
   docker compose -f docker-compose.hub.yml exec proxy nginx -s reload
   ```

---

## Variables de entorno en el servidor

En `.env` (o donde definas el entorno del compose) deberías tener al menos:

- `DB_PASSWORD`
- `JWT_SECRET`
- `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`
- `CERTBOT_EMAIL`
- Opcional (MinIO): `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`

Si no usas MinIO en producción, puedes quitar el servicio `minio` y las variables `MINIO_*` del servicio `backend` en `docker-compose.hub.yml`.
