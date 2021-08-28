export enum NFTStatus {
  pending = 'pending',
  holding = 'holding',
  selling = 'selling',
  sold = 'sold',
}

export interface INFT {
  id: string;
  txnHash: string;
  status: NFTStatus;
  metadataURL: string;
  userID: string;
  price: number;
  priceInWEI: number;
  priceInETHER: number;
  tokenID: number;
}

export interface transactionRaw {
  pending: boolean;
  transaction: {
    hash: string;
    nonce: number;
    blockHash: string;
    blockNumber: number;
    transactionIndex: number;
    from: string;
    to: string;
    value: string;
    gasPrice: string;
    gas: number;
    input: string;
  };
}
