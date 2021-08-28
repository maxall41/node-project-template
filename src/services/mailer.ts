import { Service, Inject } from 'typedi';
import { loggers } from 'winston';
import { IUser } from '../interfaces/IUser';

@Service()
export default class MailerService {
  constructor(
    @Inject('emailClient') private emailClient,
    @Inject('agendaInstance') private agenda,
    @Inject('emailDomain') private emailDomain,
  ) {}

  public async SendWelcomeEmail(user: IUser) {
    const data = {
      from: 'Bryght customer support <support@bryght.xyz>',
      to: [user.email],
      subject: 'Hello!',
      text: `Hello! Thanks for deciding to try Bryght. We hope you have a great time using our platform! If you need any help please don't hesitate to reply back to this email.`,
    };
    try {
      await this.emailClient.messages().send(data);
      this.agenda.schedule('in 7 days', 'send-welcome-feedback-email', {
        user: user,
      });
      return { delivered: 1, status: 'ok' };
    } catch (e) {
      console.log('Failed to send welcome email: ');
      console.log(e);
      return { delivered: 0, status: 'error' };
    }
  }

  public async SendFollowUpWelcomeEmail(user: IUser) {
    const data = {
      from: 'Bryght customer support <support@bryght.xyz>',
      to: [user.email],
      subject: 'Enjoying Bryght so far?',
      text: `Hey ${
        user.name.split(' ')[0]
      }! We wanted to reach out to you to ask how you experience with Bryght has been so far? We are very interested in getting to know you! If you want to talk to us you can schedule a meeting here: https://calendly.com/bryght/bryght-feedback`,
    };
    try {
      await this.emailClient.messages().send(data);
      return { delivered: 1, status: 'ok' };
    } catch (e) {
      console.log('Failed to send welcome email: ');
      console.log(e);
      return { delivered: 0, status: 'error' };
    }
  }
}
