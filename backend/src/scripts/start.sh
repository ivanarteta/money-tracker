#!/bin/sh

# Esperar a que la base de datos esté lista
echo "⏳ Esperando a que la base de datos esté lista..."
node src/scripts/wait-for-db.js

# Ejecutar migraciones
echo "📊 Ejecutando migraciones..."
npm run migrate

# Iniciar el servidor
echo "🚀 Iniciando servidor..."
if [ "$NODE_ENV" = "production" ]; then
  npm start
else
  npm run dev
fi
