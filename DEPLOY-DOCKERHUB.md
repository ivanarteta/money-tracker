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

4. **Abrir puertos en el servidor (EC2 / firewall)**  
   Asegúrate de que el **puerto 443 (HTTPS)** y el 80 (HTTP) estén abiertos. En EC2: Security Group → Inbound rules → añadir TCP 443 y 80 desde `0.0.0.0/0` (o tu IP) si quieres acceso público.

5. Descargar y levantar:
   ```bash
   docker compose -f docker-compose.hub.yml pull
   docker compose -f docker-compose.hub.yml up -d
   ```

6. Certificado SSL (primera vez, **obligatorio** para HTTPS válido):
   ```bash
   docker compose -f docker-compose.hub.yml run --rm certbot
   docker compose -f docker-compose.hub.yml restart proxy
   ```
   O desde el repo: `./scripts/obtain-ssl.sh` (usa `docker-compose.hub.yml` por defecto; `COMPOSE_FILE=...` para otro archivo).  
   Sin este paso, el proxy usará un certificado **autofirmado de 1 día**: el navegador mostrará "conexión no segura" y puede que la barra de direcciones siga en HTTP si 443 no está abierto.

7. Renovación automática (Let's Encrypt caduca en 90 días). En el servidor, añade un cron:
   ```bash
   0 3 * * * cd /ruta/a/money-tracker && docker compose -f docker-compose.hub.yml run --rm certbot renew && docker compose -f docker-compose.hub.yml exec proxy nginx -s reload
   ```

---

### Si ves "sitio no seguro" o HTTP en la barra

- **Certificado de 1 día**: Es el autofirmado. Ejecuta los pasos 6 (certbot + restart proxy).
- **Sigue en HTTP**: Comprueba que el **puerto 443** esté abierto en el Security Group de EC2. Si 443 está cerrado, el navegador no puede conectar por HTTPS y puede quedarse en HTTP o dar error.
- **Certbot falla**: Comprueba que el dominio `money-tracker.iartetadev.es` apunte (DNS A) a la IP del servidor y que el puerto 80 sea accesible desde internet (Let's Encrypt valida por HTTP).

---

## Variables de entorno en el servidor

En `.env` (o donde definas el entorno del compose) deberías tener al menos:

- `DB_PASSWORD`
- `JWT_SECRET`
- `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`
- `CERTBOT_EMAIL`
- **S3 (bucket money-tracker-uploads):** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (ej. `eu-west-1`), `S3_BUCKET=money-tracker-uploads`

Si usas S3, puedes quitar el servicio `minio` del compose; el backend ya no depende de él.
