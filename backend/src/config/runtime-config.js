const { SSMClient, GetParametersCommand } = require('@aws-sdk/client-ssm');

const REQUIRED_KEYS = ['MONGODB_URI', 'JWT_SECRET'];
const OPTIONAL_KEYS = ['REDIS_URL', 'FRONTEND_ORIGIN'];

let loadPromise;

function shouldLoadFromSsm() {
  return Boolean(process.env.AWS_EXECUTION_ENV && process.env.SSM_PARAM_PREFIX);
}

function missingRequiredKeys() {
  return REQUIRED_KEYS.filter((key) => !process.env[key]);
}

async function loadFromSsm() {
  if (!shouldLoadFromSsm()) return;

  const prefix = process.env.SSM_PARAM_PREFIX;
  const names = [...REQUIRED_KEYS, ...OPTIONAL_KEYS].map((key) => `${prefix}/${key}`);

  const client = new SSMClient({});
  const command = new GetParametersCommand({
    Names: names,
    WithDecryption: true,
  });

  const response = await client.send(command);
  const parameters = response.Parameters || [];

  parameters.forEach((param) => {
    const key = param.Name.split('/').pop();
    if (key && param.Value != null && !process.env[key]) {
      process.env[key] = param.Value;
    }
  });

  const missing = missingRequiredKeys();
  if (missing.length > 0) {
    const error = new Error(
      `Missing required configuration after SSM load: ${missing.join(', ')}`
    );
    error.statusCode = 500;
    error.errorCode = 'CONFIG_MISSING';
    throw error;
  }
}

async function ensureRuntimeConfig() {
  if (!loadPromise) {
    loadPromise = loadFromSsm().catch((err) => {
      loadPromise = null;
      throw err;
    });
  }
  await loadPromise;
}

module.exports = {
  ensureRuntimeConfig,
};
