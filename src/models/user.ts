import { IUser } from '@/interfaces/IUser';
import mongoose from 'mongoose';

const User = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter a full name'],
      index: true,
    },

    walletAddress: String,
    walletPrivateKey: {
      version: Number,
      id: String,
      address: String,
      crypto: {
        ciphertext: String,
        cipherparams: {
          iv: String,
        },
        cipher: String,
        kdf: String,
        kdfparams: {
          dklen: Number,
          salt: String,
          n: Number,
          r: Number,
          p: Number,
        },
        mac: String,
      },
    },
    paymentAddress: String,
    walletPrivateKeySalt: String,

    nonce: {
      type: String,
      unique: true,
    },

    email: {
      type: String,
      lowercase: true,
      unique: true,
      index: true,
    },

    id: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model<IUser & mongoose.Document>('User', User);
