import { Service, Inject } from 'typedi';
import { IUser } from '../interfaces/IUser';

@Service()
export default class UserService {
  constructor(
    @Inject('userModel') private userModel: Models.UserModel,
  ) {}

  public async GetUser(id: string): Promise<{ user: IUser }> {
    const userRecord = await this.userModel.findOne({ id: id });
    if (!userRecord) {
      throw new Error('User not registered');
    }
    const user = userRecord.toObject();
    return { user }
  }
}