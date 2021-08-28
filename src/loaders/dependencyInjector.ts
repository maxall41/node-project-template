import { Container } from 'typedi';
const Mailgun = require('mailgun-js');
import LoggerInstance from './logger';
import agendaFactory from './agenda';
import { createAlchemyWeb3 } from '@alch/alchemy-web3';
const { RelayProvider } = require('@opengsn/provider');
import config from '../config';

export default async ({ mongoConnection, models }: { mongoConnection; models: { name: string; model: any }[] }) => {
  try {
    models.forEach(m => {
      Container.set(m.name, m.model);
    });

    // Setup mailgun
    const mailgun = new Mailgun({ apiKey: config.emails.apiKey, domain: config.emails.domain });

    const agendaInstance = agendaFactory({ mongoConnection });
    // Create Web3
    const web3 = createAlchemyWeb3(config.alchemy_api_key);
    // Inject
    Container.set('agendaInstance', agendaInstance);
    Container.set('logger', LoggerInstance);
    Container.set('emailClient', mailgun);
    Container.set('emailDomain', config.emails.domain);
    Container.set('web3', web3);

    LoggerInstance.info('✌️ Agenda injected into container');

    return { agenda: agendaInstance };
  } catch (e) {
    LoggerInstance.error('🔥 Error on dependency injector loader: %o', e);
    throw e;
  }
};
