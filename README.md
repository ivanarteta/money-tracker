# Money Tracker

Aplicación de gestión personal de gastos e ingresos con arquitectura API-first.

## Características

- **Autenticación JWT**: Registro e inicio de sesión seguro
- **Gestión de Movimientos**: CRUD completo para gastos e ingresos
- **Adjuntos en movimientos**: Asociar un PDF a cada movimiento (subir desde la app o elegir uno ya guardado)
- **Archivos / Storage**: Subir, listar, descargar y eliminar PDFs por usuario; modal con drag & drop
- **Almacenamiento S3-compatible**: En desarrollo MinIO; en producción AWS S3 (bucket configurable)
- **Informes**: Semanal, mensual y por rango de fechas
- **Exportación a PDF**: Informes semanal, mensual y por rango
- **Preferencias de usuario**: Edición de perfil y divisa de trabajo
- **Dashboard visual**: Gráfica diaria del mes en curso (ingresos/gastos + balance acumulado)
- **Notificaciones por Email**: Envío automático de informes periódicos
- **Frontend responsive**: Interfaz web moderna y adaptable
- **Producción**: Proxy nginx, dominio propio y SSL con Let's Encrypt (Certbot)
- **API REST**: Preparada para consumo desde aplicaciones móviles

## Arquitectura

- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: React + Vite
- **Autenticación**: JWT (JSON Web Tokens)
- **Base de datos**: PostgreSQL
- **Almacenamiento**: Servicio S3-compatible (MinIO en desarrollo, AWS S3 en producción)
- **Tareas programadas**: node-cron para envío de emails
- **Producción**: Docker Compose con proxy nginx (80/443), Certbot para SSL, opcionalmente imágenes en Docker Hub

## Inicio rápido (desarrollo local)

### Prerrequisitos

- Docker y Docker Compose instalados
- (Opcional) Node.js 18+ si prefieres ejecutar sin Docker

### Pasos

1. **Clonar el repositorio** (si aplica)

2. **Configurar variables de entorno**

   Crea un archivo `.env` en la raíz del proyecto (opcional para desarrollo):

   ```env
   EMAIL_USER=tu-email@gmail.com
   EMAIL_PASSWORD=tu-app-password
   ```

   > **Nota**: Para Gmail, genera una "Contraseña de aplicación" desde la configuración de tu cuenta.

3. **Iniciar con Docker Compose**

   ```bash
   docker compose up -d
   ```

   Se levantan:
   - PostgreSQL (puerto 5432)
   - Backend API (puerto 3000)
   - Frontend con Vite (puerto 5173)
   - MinIO (puertos 9000, 9001) para almacenamiento de archivos en desarrollo

4. **Migraciones**

   Se ejecutan al arrancar el backend. Manualmente:

   ```bash
   docker compose exec backend npm run migrate
   ```

5. **Acceder a la aplicación**

   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Health: http://localhost:3000/health
   - MinIO consola: http://localhost:9001 (usuario `minio`, contraseña `minio123`)

### Desarrollo sin Docker

#### Backend

```bash
cd backend
npm install
cp .env.example .env   # Configura DB, JWT, email y opcionalmente MinIO/S3
npm run migrate
npm run dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### Autenticación

- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `GET /api/auth/profile` - Obtener perfil (requiere autenticación)
- `PUT /api/auth/profile` - Actualizar perfil (requiere autenticación)

### Movimientos

- `GET /api/movements` - Listar movimientos (requiere autenticación)
- `GET /api/movements?startDate=...&endDate=...` - Listar por rango
- `POST /api/movements` - Crear movimiento (body puede incluir `attachmentObjectName` para asociar un archivo)
- `GET /api/movements/:id` - Obtener movimiento
- `PUT /api/movements/:id` - Actualizar movimiento (incl. `attachmentObjectName`)
- `DELETE /api/movements/:id` - Eliminar movimiento

### Storage (archivos por usuario)

- `GET /api/storage` - Listar archivos del usuario (requiere autenticación)
- `POST /api/storage/upload` - Subir PDF (multipart, campo `file`) (requiere autenticación)
- `GET /api/storage/download/:objectName` - Obtener URL firmada de descarga (requiere autenticación)
- `DELETE /api/storage/:objectName` - Eliminar archivo (requiere autenticación). Si el archivo estaba asociado a movimientos, se limpia la referencia.

### Informes

- `GET /api/reports/weekly` - Informe semanal
- `GET /api/reports/monthly` - Informe mensual
- `GET /api/reports/range?startDate=...&endDate=...` - Informe por rango
- `GET /api/reports/weekly/pdf`, `monthly/pdf`, `range/pdf?...` - Versión PDF (requiere autenticación)

## Despliegue en producción

### Opción 1: Imágenes en Docker Hub (recomendado)

Las imágenes se construyen y publican en Docker Hub; en el servidor solo se hace `pull` y `up`. Ver **[DEPLOY-DOCKERHUB.md](DEPLOY-DOCKERHUB.md)** para:

- Build y push de backend, frontend y proxy
- Uso de `docker-compose.hub.yml` en el servidor
- Variables de entorno (DB, JWT, email, **S3**, Certbot)
- Obtención y renovación del certificado SSL con Certbot

Resumen de comandos (sustituye `TU_USUARIO` por tu usuario de Docker Hub):

```bash
docker login
docker build -t TU_USUARIO/money-tracker-backend:latest ./backend && docker push TU_USUARIO/money-tracker-backend:latest
docker build -t TU_USUARIO/money-tracker-frontend:latest ./frontend && docker push TU_USUARIO/money-tracker-frontend:latest
docker build -t TU_USUARIO/money-tracker-proxy:latest ./proxy && docker push TU_USUARIO/money-tracker-proxy:latest
```

En el servidor, configura el `.env` (incluidas variables S3 y Certbot), sustituye en `docker-compose.hub.yml` el usuario de Docker Hub y ejecuta:

```bash
docker compose -f docker-compose.hub.yml pull
docker compose -f docker-compose.hub.yml up -d
```

### Opción 2: Build en el servidor

Puedes usar `docker-compose.yml.prod` (o similar) que construye las imágenes en el servidor. Asegura tener configuradas las variables de entorno del backend (DB, JWT, email, **S3** en producción).

### Almacenamiento en producción (S3)

En producción el backend usa **AWS S3**. Configura en el entorno del contenedor backend:

- `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` (credenciales IAM con permisos sobre el bucket)
- `AWS_REGION` (ej. `eu-west-1`)
- `S3_BUCKET` (ej. `money-tracker-uploads`)

Sin estas variables, en `NODE_ENV=production` el backend lanzará un error al usar storage. En desarrollo se usa MinIO si no hay variables S3.

## Configuración de email

- **Gmail**: Genera una "Contraseña de aplicación" en tu cuenta de Google.
- **Otros**: Ajusta `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD` y `EMAIL_FROM`.

Tareas programadas:

- Informes semanales: cada lunes a las 9:00
- Informes mensuales: día 1 de cada mes a las 9:00

## Preparado para móvil

La API REST puede consumirse desde apps móviles. Envío del token JWT:

```
Authorization: Bearer <token>
```

## Tecnologías utilizadas

### Backend

- Node.js, Express.js, PostgreSQL
- JWT (jsonwebtoken), bcryptjs, express-validator
- node-cron, nodemailer, pdfkit
- MinIO (cliente S3-compatible), multer (subida de archivos)

### Frontend

- React, Vite, React Router, Axios, Recharts, CSS3

### DevOps

- Docker, Docker Compose
- Nginx (proxy y servido del frontend en producción)
- Certbot (Let's Encrypt)

## Estructura del proyecto

```
money-tracker/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── database/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/       # storageService.js (S3/MinIO), emailService, scheduledTasks
│   │   └── server.js
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/          # Dashboard, Movements, Reports, Settings, Storage
│   │   ├── services/
│   │   └── App.jsx
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── nginx.conf
│   └── package.json
├── proxy/                   # Nginx + SSL (dominio, Certbot)
│   ├── Dockerfile
│   ├── entrypoint.sh
│   └── nginx.conf
├── docker-compose.yml       # Desarrollo (db, backend, frontend, minio)
├── docker-compose.hub.yml   # Producción con imágenes Docker Hub + S3
├── docker-compose.yml.prod # Producción build local (opcional)
├── DEPLOY-DOCKERHUB.md      # Guía despliegue con Docker Hub y SSL
└── README.md
```

## Seguridad

- Contraseñas con bcrypt
- Autenticación JWT
- Validación de entrada (express-validator)
- Rutas protegidas con middleware de autenticación
- Storage: solo se permiten operaciones sobre objetos bajo `userId/`; en producción uso de S3 con IAM restrictivo recomendado

## Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.
