# Money Tracker

Aplicación de gestión personal de gastos e ingresos con arquitectura API-first.

## Características

- **Autenticación JWT**: Registro e inicio de sesión seguro
- **Gestión de Movimientos**: CRUD completo para gastos e ingresos
- **Informes**: Semanal, mensual y por rango de fechas
- **Exportación a PDF**: Informes semanal, mensual y por rango
- **Preferencias de usuario**: Edición de perfil y divisa de trabajo
- **Dashboard visual**: Gráfica diaria del mes en curso (ingresos/gastos + balance acumulado)
- **Notificaciones por Email**: Envío automático de informes periódicos
- **Frontend Responsive**: Interfaz web moderna y adaptable
- **API REST**: Preparada para consumo desde aplicaciones móviles

## Arquitectura

- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: React + Vite
- **Autenticación**: JWT (JSON Web Tokens)
- **Base de Datos**: PostgreSQL
- **Tareas Programadas**: node-cron para envío de emails
- **Contenedores**: Docker y Docker Compose

## Inicio rápido (desarrollo local)

### Prerrequisitos

- Docker y Docker Compose instalados
- (Opcional) Node.js 18+ si prefieres ejecutar sin Docker

### Pasos

1. **Clonar el repositorio** (si aplica)

2. **Configurar variables de entorno**

   Crea un archivo `.env` en la raíz del proyecto (opcional para desarrollo, ya que docker-compose tiene valores por defecto):

   ```env
   EMAIL_USER=tu-email@gmail.com
   EMAIL_PASSWORD=tu-app-password
   ```

   > **Nota**: Para Gmail, necesitas generar una "Contraseña de aplicación" desde la configuración de tu cuenta.

3. **Iniciar con Docker Compose**

   ```bash
   docker compose up -d
   ```

   Esto iniciará:
   - PostgreSQL en el puerto 5432
   - Backend API en el puerto 3000
   - Frontend en el puerto 5173

4. **Ejecutar migraciones de base de datos**

   Las migraciones se ejecutan automáticamente al iniciar el backend. Si necesitas ejecutarlas manualmente:

   ```bash
   docker compose exec backend npm run migrate
   ```

5. **Acceder a la aplicación**

   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Health Check: http://localhost:3000/health

### Desarrollo sin Docker

Si prefieres ejecutar sin Docker:

#### Backend

```bash
cd backend
npm install
cp .env.example .env  # Edita el archivo .env con tus configuraciones
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
- `PUT /api/auth/profile` - Actualizar perfil (name, email, password opcional, currency) (requiere autenticación)

### Movimientos

- `GET /api/movements` - Listar movimientos (requiere autenticación)
- `GET /api/movements?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` - Listar por rango de fechas (requiere autenticación)
- `POST /api/movements` - Crear movimiento (requiere autenticación)
- `GET /api/movements/:id` - Obtener movimiento (requiere autenticación)
- `PUT /api/movements/:id` - Actualizar movimiento (requiere autenticación)
- `DELETE /api/movements/:id` - Eliminar movimiento (requiere autenticación)

### Informes

- `GET /api/reports/weekly` - Informe semanal (requiere autenticación)
- `GET /api/reports/monthly` - Informe mensual (requiere autenticación)
- `GET /api/reports/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` - Informe por rango (requiere autenticación)
- `GET /api/reports/weekly/pdf` - Informe semanal PDF (requiere autenticación)
- `GET /api/reports/monthly/pdf` - Informe mensual PDF (requiere autenticación)
- `GET /api/reports/range/pdf?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` - Informe por rango PDF (requiere autenticación)

## Despliegue en producción

### Construir imágenes Docker

#### Backend

```bash
cd backend
docker build -t money-tracker-backend:latest .
```

#### Frontend

```bash
cd frontend
docker build -t money-tracker-frontend:latest .
```

### Variables de Entorno para Producción

Asegúrate de configurar las siguientes variables de entorno en producción:

**Backend (.env):**

```env
DB_HOST=tu-host-postgresql
DB_PORT=5432
DB_NAME=money_tracker
DB_USER=tu-usuario
DB_PASSWORD=tu-contraseña-segura
JWT_SECRET=tu-secret-key-muy-segura
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=production
EMAIL_HOST=smtp.tu-servidor.com
EMAIL_PORT=587
EMAIL_USER=tu-email@dominio.com
EMAIL_PASSWORD=tu-contraseña
EMAIL_FROM=noreply@tu-dominio.com
```

**Frontend (.env):**

```env
VITE_API_URL=https://api.tu-dominio.com/api
```

### Ejemplo de docker-compose para producción

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: money_tracker
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  backend:
    image: money-tracker-backend:latest
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: money_tracker
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: 7d
      PORT: 3000
      NODE_ENV: production
      EMAIL_HOST: ${EMAIL_HOST}
      EMAIL_PORT: ${EMAIL_PORT}
      EMAIL_USER: ${EMAIL_USER}
      EMAIL_PASSWORD: ${EMAIL_PASSWORD}
      EMAIL_FROM: ${EMAIL_FROM}
    depends_on:
      - db
    restart: always
    command: sh -c "npm run migrate && npm start"

  frontend:
    image: money-tracker-frontend:latest
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: always

volumes:
  postgres_data:
```

## Configuración de email

Para que las tareas programadas envíen emails, necesitas configurar:

1. **Gmail**: Genera una "Contraseña de aplicación" desde tu cuenta de Google
2. **Otros proveedores**: Ajusta `EMAIL_HOST` y `EMAIL_PORT` según tu proveedor

Las tareas programadas están configuradas para:
- **Informes semanales**: Cada lunes a las 9:00 AM
- **Informes mensuales**: El día 1 de cada mes a las 9:00 AM

## Preparado para móvil

La API REST está diseñada para ser consumida por aplicaciones móviles. Todos los endpoints requieren autenticación mediante JWT en el header:

```
Authorization: Bearer <token>
```

## Tecnologías utilizadas

### Backend
- Node.js
- Express.js
- PostgreSQL
- JWT (jsonwebtoken)
- bcryptjs
- express-validator
- node-cron
- nodemailer
- pdfkit

### Frontend
- React
- Vite
- React Router
- Axios
- Recharts
- CSS3

### DevOps
- Docker
- Docker Compose
- Nginx (producción)

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
│   │   ├── services/
│   │   └── server.js
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.jsx
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Seguridad

- Contraseñas hasheadas con bcrypt
- Autenticación JWT
- Validación de datos de entrada
- Protección de rutas con middleware de autenticación

## Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.
