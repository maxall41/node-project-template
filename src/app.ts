import 'reflect-metadata'; // We need this in order to use @Decorators

import config from './config';

import express from 'express';

import Logger from './loaders/logger';

async function startServer() {
  const app = express();

  await require('./loaders').default({ expressApp: app });

  app.listen(config.port).on('error', err => {
    Logger.error(err);
    process.exit(1);
  });

}

module.exports = {
  startServer: startServer,
};
