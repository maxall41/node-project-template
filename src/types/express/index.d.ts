import { Document, Model } from 'mongoose';
import { IUser } from '@/interfaces/IUser';
import { INFT } from '@/interfaces/INFT';
import { IPurchase } from '@/interfaces/PendingPurchase';
declare global {
  namespace Express {
    export interface Request {
      currentUser: IUser & Document;
    }    
  }

  namespace Models {
    export type UserModel = Model<IUser & Document>;
    export type NFTModel = Model<INFT & Document>;
    export type PurchaseModel = Model<IPurchase & Document>;
  }
}
