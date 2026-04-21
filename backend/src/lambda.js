const mongoose = require('mongoose');
const serverless = require('serverless-http');
const app = require('./app');
const { ensureRuntimeConfig } = require('./config/runtime-config');

let initialized = false;
const handler = serverless(app);

async function initialize() {
  if (initialized) return;

  await ensureRuntimeConfig();

  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri && mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }

  initialized = true;
}

module.exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  await initialize();
  return handler(event, context);
};
