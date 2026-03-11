import cron from 'node-cron';
import pool from '../config/database.js';
import { generateReportForEmail } from '../controllers/reportController.js';
import { sendReportEmail } from './emailService.js';

// Enviar informe semanal cada domingo a las 9:00 AM
cron.schedule('0 9 * * 7', async () => {
  console.log('📧 Iniciando envío de informes semanales...');
  
  try {
    const result = await pool.query('SELECT id FROM users');
    const users = result.rows;

    for (const user of users) {
      try {
        const report = await generateReportForEmail(user.id, 'weekly');
        if (report) {
          await sendReportEmail(report.user, report);
        }
      } catch (error) {
        console.error(`Error procesando usuario ${user.id}:`, error);
      }
    }

    console.log('✅ Envío de informes semanales completado');
  } catch (error) {
    console.error('❌ Error en tarea programada semanal:', error);
  }
});

// Enviar informe mensual el primer día de cada mes a las 9:00 AM
cron.schedule('0 9 1 * *', async () => {
  console.log('📧 Iniciando envío de informes mensuales...');
  
  try {
    const result = await pool.query('SELECT id FROM users');
    const users = result.rows;

    for (const user of users) {
      try {
        const report = await generateReportForEmail(user.id, 'monthly');
        if (report) {
          await sendReportEmail(report.user, report);
        }
      } catch (error) {
        console.error(`Error procesando usuario ${user.id}:`, error);
      }
    }

    console.log('✅ Envío de informes mensuales completado');
  } catch (error) {
    console.error('❌ Error en tarea programada mensual:', error);
  }
});

console.log('⏰ Tareas programadas configuradas:');
console.log('  - Informes semanales: Domingo a las 9:00 AM');
console.log('  - Informes mensuales: Día 1 de cada mes a las 9:00 AM');
