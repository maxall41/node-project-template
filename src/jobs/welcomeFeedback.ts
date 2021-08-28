import { Container } from 'typedi';
import MailerService from '../services/mailer';
import { Logger } from 'winston';
import { IUser } from '@/interfaces/IUser';

export default class FollowupWelcomeEmailJob {
  public async handler(job, done): Promise<void> {
    const Logger: Logger = Container.get('logger');
    try {
      Logger.debug('✌️ Welcome Feedback Job triggered!');
      const user: IUser = job.attrs.data.user;
      const mailerServiceInstance = Container.get(MailerService);
      await mailerServiceInstance.SendFollowUpWelcomeEmail(user);
      done();
    } catch (e) {
      Logger.error('🔥 Error with Welcome Feedback Job: %o', e);
      done(e);
    }
  }
}
