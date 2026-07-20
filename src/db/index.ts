import { Sequelize } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { retrieveSecret } from '../services/secretStore';

// Validate required environment variables for non-secret config
const requiredVars = [
  'DATAENTRY_DB_HOST',
  'DATAENTRY_DB_NAME',
  'DATAENTRY_DB_USER',
  'IMAGES_DB_HOST',
  'IMAGES_DB_NAME',
  'IMAGES_DB_USER'
];

requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

const CA_CERT_PATH = path.join(__dirname, '../../config/mysql-ca.pem');

function getSslConfig() {
  if (!fs.existsSync(CA_CERT_PATH)) {
    throw new Error(
      `MySQL CA certificate not found at ${CA_CERT_PATH}. ` +
      'TLS verification requires the CA cert. Place mysql-ca.pem in config/ directory.'
    );
  }
  return {
    ca: fs.readFileSync(CA_CERT_PATH),
    require: true,
    rejectUnauthorized: true
  };
}

let dataEntryDb: Sequelize;
let imagesDb: Sequelize;

export async function initDatabaseConnections() {
  const [secretDataEntryPass, secretImagesPass] = await Promise.all([
    retrieveSecret('DATAENTRY_DB_PASSWORD'),
    retrieveSecret('IMAGES_DB_PASSWORD')
  ]);

  const dataEntryPass = secretDataEntryPass || process.env.DATAENTRY_DB_PASSWORD;
  const imagesPass = secretImagesPass || process.env.IMAGES_DB_PASSWORD;

  if (!dataEntryPass) {
    throw new Error('DataEntry DB password not found in secret store or environment');
  }
  if (!imagesPass) {
    throw new Error('Images DB password not found in secret store or environment');
  }

  dataEntryDb = new Sequelize(
    process.env.DATAENTRY_DB_NAME!,
    process.env.DATAENTRY_DB_USER!,
    dataEntryPass,
    {
      host: process.env.DATAENTRY_DB_HOST,
      dialect: 'mysql',
      dialectOptions: {
        ssl: getSslConfig()
      },
      pool: {
        max: 5,
        min: 0,
        idle: 10000
      },
      logging: false
    }
  );

  imagesDb = new Sequelize(
    process.env.IMAGES_DB_NAME!,
    process.env.IMAGES_DB_USER!,
    imagesPass,
    {
      host: process.env.IMAGES_DB_HOST,
      dialect: 'mysql',
      dialectOptions: {
        ssl: getSslConfig()
      },
      pool: {
        max: 5,
        min: 0,
        idle: 10000
      },
      logging: false
    }
  );

  return { dataEntryDb, imagesDb };
}

export { dataEntryDb, imagesDb };

export function getDatabaseConnections() {
  if (!dataEntryDb || !imagesDb) {
    throw new Error('Databases not initialized - call initDatabaseConnections() first');
  }
  return { dataEntryDb, imagesDb };
}

export async function checkDbConnections() {
  try {
    const { dataEntryDb, imagesDb } = getDatabaseConnections();
    await dataEntryDb.authenticate();
    await imagesDb.authenticate();
    return { dataEntry: true, images: true };
  } catch (error) {
    return {
      dataEntry: false,
      images: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
