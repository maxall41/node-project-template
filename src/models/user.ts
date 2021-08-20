import { IUser } from '@/interfaces/IUser';
import mongoose from 'mongoose';

const User = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter a full name'],
      index: true,
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

    password: String,

    salt: String,
  },
  { timestamps: true },
);

export default mongoose.model<IUser & mongoose.Document>('User', User);
