import { Service, Inject } from 'typedi';
import { IUser } from '../interfaces/IUser';

@Service()
export default class UserService {
  constructor(@Inject('userModel') private userModel: Models.UserModel, @Inject('logger') private logger) {}

  public async GetUser(id: string): Promise<{ user: IUser }> {
    const userRecord = await this.userModel.findOne({ id: id });
    if (!userRecord) {
      throw new Error('User not registered');
    }
    const user = userRecord.toObject();
    Reflect.deleteProperty(user, 'password');
    Reflect.deleteProperty(user, 'salt');
    Reflect.deleteProperty(user, 'walletPrivateKeySalt');
    Reflect.deleteProperty(user, 'walletPrivateKey');
    return { user };
  }

  public async DeleteAccount(id: string): Promise<boolean> {
    try {
      const userDeletion = await this.userModel.deleteOne({ id: id });
      return true;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async GetUserFromPublicKey(publicKey: string): Promise<{ user: IUser }> {
    console.log('Checking if address ' + publicKey);
    const userRecord = await this.userModel.findOne({ paymentAddress: publicKey });
    if (!userRecord) {
      throw new Error('User not registered');
    }
    const user = userRecord.toObject();
    Reflect.deleteProperty(user, 'password');
    Reflect.deleteProperty(user, 'salt');
    Reflect.deleteProperty(user, 'walletPrivateKeySalt');
    Reflect.deleteProperty(user, 'walletPrivateKey');
    return { user };
  }
}
