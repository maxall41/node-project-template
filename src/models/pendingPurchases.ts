import { IPurchase, PendingPurchaseStatus } from '../interfaces/PendingPurchase';
import mongoose from 'mongoose';

const PendingPurchase = new mongoose.Schema(
  {
    txnHash: String,
    status: {
        type: String,
        enum: ['pending','completed','dropped','fraud']
    },
    id: String
  },
  { timestamps: true },
);

export default mongoose.model<IPurchase & mongoose.Document>('PendingPurchases', PendingPurchase);
