import dotenv from 'dotenv';

// Set the NODE_ENV to 'development' by default
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const envFound = dotenv.config();
if (envFound.error) {
  // This error should crash whole process

  throw new Error("⚠️  Couldn't find .env file  ⚠️");
}

export default {
  /**
   * Minting contract address
   */
  mintingContractAddress: process.env.minting_contract_address,
  /**
   * Alchemy api key
   */
  alchemy_api_key: process.env.alchemy_api_key,

  /**
   * Encryption key used to encrypt wallet addresses
   */
  wallet_private_key_encryption_key: process.env.wallet_private_key_encryption_key,

  /**
   * Amount to initially give accounts upon signup in USD
   *
   */
  initialGasFeeFundingCoverageUSD: 1, // Can handle about 40 minted NFTS in gas fees
  /**
   * Your favorite port
   */
  port: parseInt(process.env.PORT, 10),

  /**
   * Eth gas API key
   */
  ethGasAPIKey: process.env.eth_gas_api_key,

  /**
   * Coin market cap API key
   */
  cmcProAPIKey: process.env.cmc_pro_api_key,

  /**
   * Gas fee covering account info
   */
  GAS_FEE_COVER_PUB_KEY: process.env.GAS_FEE_COVER_PUB_KEY,
  GAS_FEE_COVER_PRV_KEY: process.env.GAS_FEE_COVER_PRV_KEY,

  /**
   * That long string from mlab
   */
  databaseURL: process.env.MONGODB_URI,

  /**
   * Your secret sauce
   */
  jwtSecret: process.env.JWT_SECRET,
  jwtAlgorithm: process.env.JWT_ALGO,

  environment: process.env.environment,

  /**
   * Used by winston logger
   */
  logs: {
    level: process.env.LOG_LEVEL || 'silly',
  },
  /**
   * Payment address of bryght so we get paid on sales
   */
  ethPaymentAddress: '0x2d487e4FB5f6fAa3255E2fFE5E0D8C2B2054f45B',

  /**
   * Paymaster address so we pay costs of minting NFTS and not the user
   */
  paymasterAddress: '0x76dB0E0e01b26cA06632993075cD80eece25dB81',

  /**
   * Agenda.js stuff
   */
  agenda: {
    dbCollection: process.env.AGENDA_DB_COLLECTION,
    pooltime: process.env.AGENDA_POOL_TIME,
    concurrency: parseInt(process.env.AGENDA_CONCURRENCY, 10),
  },

  /**
   * Agendash config
   */
  agendash: {
    user: 'agendash',
    password: '123456',
  },
  /**
   * API configs
   */
  api: {
    prefix: '/api',
  },
  /**
   * Mailgun email credentials
   */
  emails: {
    apiKey: process.env.MAILGUN_API_KEY,
    apiUsername: process.env.MAILGUN_USERNAME,
    domain: process.env.MAILGUN_DOMAIN,
  },
};
