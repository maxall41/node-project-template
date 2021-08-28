import { Container } from 'typedi';
import MailerService from '../services/mailer';
import { Logger } from 'winston';
import { IUser } from '../interfaces/IUser';
import config from '../config';
import axios from 'axios';

export default class GasFeeCoveringJob {
  public async handler(job, done): Promise<void> {
    const Logger: Logger = Container.get('logger');
    const agenda: any = Container.get('agendaInstance');
    const web3: any = Container.get('web3');
    const userModel: Models.UserModel = Container.get('userModel');
    try {
      Logger.debug('✌️ Gas Fee Covering Job triggered!');
      //TODO: Move this to a service
      const users: IUser[] = await userModel.find({}).lean().exec();

      for (var i = 0; i < users.length; i++) {
        // Make sure we don't get 429 Too many requests
        agenda.schedule('in ' + i + ' seconds', 'cover-gas-fees-for-user', {
          user: users[i],
        });
      }

      done();
    } catch (e) {
      Logger.error('🔥 Error with Gass Fee Covering Job: %o', e);
      done(e);
    }
  }
}
