import * as Minio from 'minio';

const BUCKET = process.env.MINIO_BUCKET || 'money-tracker';

let client = null;

function getClient() {
  if (!client) {
    const endPoint = (process.env.MINIO_ENDPOINT || 'minio').replace(/^https?:\/\//, '').split(':')[0];
    const port = parseInt(process.env.MINIO_PORT || '9000', 10);
    const useSSL = process.env.MINIO_USE_SSL === 'true';
    client = new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey: process.env.MINIO_ACCESS_KEY || 'minio',
      secretKey: process.env.MINIO_SECRET_KEY || 'minio123',
    });
  }
  return client;
}

/**
 * Asegura que el bucket existe; si no, lo crea.
 */
export async function ensureBucket() {
  const mc = getClient();
  const exists = await mc.bucketExists(BUCKET);
  if (!exists) {
    await mc.makeBucket(BUCKET);
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
  const objectName = `${userId}/${filename}`;
  await mc.putObject(BUCKET, objectName, buffer, buffer.length, { 'Content-Type': contentType });
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
  const prefix = `${userId}/`;
  const items = [];
  return new Promise((resolve, reject) => {
    const stream = mc.listObjects(BUCKET, prefix, true);
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
  const url = await mc.presignedGetObject(BUCKET, objectName, 60 * 60); // 1 hora
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
  await mc.removeObject(BUCKET, objectName);
}
