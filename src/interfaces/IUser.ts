export interface IUser {
  id: string;
  name: string;
  email: string;
  nonce: string;
  walletAddress: string;
  walletPrivateKey: string;
  walletPrivateKeySalt: string;
  paymentAddress: string;
}

export interface IUserJWT {
  exp: number;
  address: string;
  name: string;
  id: string;
  paymentAddress: string;
}

export interface IUserInputDTO {
  name: string;
  email: string;
  password: string;
  paymentAddress: string;
}
