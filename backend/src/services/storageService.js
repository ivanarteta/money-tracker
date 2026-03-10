/**
 * Servicio de almacenamiento de archivos (S3-compatible).
 * Soporta MinIO (desarrollo) o AWS S3 (producción) según variables de entorno.
 */
import * as Minio from 'minio';

let client = null;

/** true si debemos usar AWS S3 (credenciales o bucket S3 definidos) */
function useS3() {
  return !!(process.env.AWS_ACCESS_KEY_ID || process.env.S3_BUCKET);
}

function getBucket() {
  if (useS3()) return process.env.S3_BUCKET || 'money-tracker-uploads';
  return process.env.MINIO_BUCKET || 'money-tracker';
}

function assertStorageConfig() {
  if (process.env.NODE_ENV === 'production' && !useS3()) {
    throw new Error(
      'En producción el almacenamiento debe usar S3. Configura: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET y AWS_REGION en el entorno del backend.'
    );
  }
}

function getClient() {
  assertStorageConfig();
  if (!client) {
    if (useS3()) {
      const endpoint = (process.env.S3_ENDPOINT || 's3.amazonaws.com').replace(/^https?:\/\//, '').split(':')[0];
      const port = parseInt(process.env.S3_PORT || '443', 10);
      const region = process.env.AWS_REGION || process.env.MINIO_REGION || 'eu-west-1';
      client = new Minio.Client({
        endPoint: endpoint,
        port,
        useSSL: true,
        accessKey: process.env.AWS_ACCESS_KEY_ID,
        secretKey: process.env.AWS_SECRET_ACCESS_KEY,
        region,
      });
    } else {
      const endpoint = (process.env.MINIO_ENDPOINT || 'minio').replace(/^https?:\/\//, '').split(':')[0];
      const port = parseInt(process.env.MINIO_PORT || '9000', 10);
      client = new Minio.Client({
        endPoint: endpoint,
        port,
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY || 'minio',
        secretKey: process.env.MINIO_SECRET_KEY || 'minio123',
      });
    }
  }
  return client;
}

/**
 * Asegura que el bucket existe; si no, lo crea.
 */
export async function ensureBucket() {
  const bucket = getBucket();
  const mc = getClient();
  const exists = await mc.bucketExists(bucket);
  if (!exists) {
    await mc.makeBucket(bucket);
  }
}

/**
 * Sube un archivo (Buffer) al bucket en la ruta {userId}/{filename}.
 * @param {number} userId - ID del usuario
 * @param {string} filename - Nombre del archivo (ej. informe.pdf)
 * @param {Buffer} buffer - Contenido del archivo
 * @param {string} contentType - ej. 'application/pdf'
 * @returns {Promise<{ path: string, objectName: string }>}
 */
export async function uploadFile(userId, filename, buffer, contentType = 'application/pdf') {
  await ensureBucket();
  const mc = getClient();
  const bucket = getBucket();
  const objectName = `${userId}/${filename}`;
  await mc.putObject(bucket, objectName, buffer, buffer.length, { 'Content-Type': contentType });
  return { path: objectName, objectName };
}

/**
 * Lista los archivos del usuario en el bucket (prefijo userId/).
 * @param {number} userId - ID del usuario
 * @returns {Promise<Array<{ name: string, size: number, lastModified: Date }>>}
 */
export async function listUserFiles(userId) {
  await ensureBucket();
  const mc = getClient();
  const bucket = getBucket();
  const prefix = `${userId}/`;
  const items = [];
  return new Promise((resolve, reject) => {
    const stream = mc.listObjects(bucket, prefix, true);
    stream.on('data', (obj) => {
      items.push({
        name: obj.name,
        filename: obj.name.replace(prefix, ''),
        size: obj.size || 0,
        lastModified: obj.lastModified,
      });
    });
    stream.on('end', () => resolve(items));
    stream.on('error', reject);
  });
}

/**
 * Genera una URL firmada para descargar un objeto (solo si pertenece al usuario).
 * @param {string} objectName - Ruta en el bucket (userId/filename)
 * @param {number} userId - ID del usuario (para verificar que el objeto es suyo)
 * @returns {Promise<string>} URL temporal de descarga
 */
export async function getPresignedDownloadUrl(objectName, userId) {
  const prefix = `${userId}/`;
  if (!objectName.startsWith(prefix)) {
    throw new Error('No autorizado');
  }
  const mc = getClient();
  const bucket = getBucket();
  const url = await mc.presignedGetObject(bucket, objectName, 60 * 60); // 1 hora
  return url;
}

/**
 * Elimina un objeto del bucket (solo si pertenece al usuario).
 * @param {string} objectName - Ruta en el bucket (userId/filename)
 * @param {number} userId - ID del usuario (para verificar que el objeto es suyo)
 * @returns {Promise<void>}
 */
export async function deleteUserFile(objectName, userId) {
  const prefix = `${userId}/`;
  if (!objectName.startsWith(prefix)) {
    throw new Error('No autorizado');
  }
  const mc = getClient();
  const bucket = getBucket();
  await mc.removeObject(bucket, objectName);
}
