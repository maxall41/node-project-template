import { INFT } from '@/interfaces/INFT';
import mongoose from 'mongoose';

const Nft = new mongoose.Schema(
  {
    id: String,
    txnHash: String,
    status: {
        type: String,
        enum: ['pending','holding','selling','sold']
    },
    metadataURL: String,
    userID: String,
    url: String,
    nftData: {
        name: String,
        description: String,
        image: String
    },
    price: {
      type: Number
    },
    priceInWEI: Number,
    priceInETHER: Number,
    tokenID: Number
  },
  { timestamps: true },
);

export default mongoose.model<INFT & mongoose.Document>('NFTS', Nft);
