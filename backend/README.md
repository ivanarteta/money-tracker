# Money Tracker - Backend API

API REST para la gestión de gastos e ingresos personales.

## Configuración

1. Copia el archivo `.env.example` a `.env` y configura las variables:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=money_tracker
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@money-tracker.com
```

2. Instala las dependencias:

```bash
npm install
```

3. Ejecuta las migraciones:

```bash
npm run migrate
```

4. Inicia el servidor:

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## Endpoints

Ver documentación completa en el README principal.
