export interface IUser {
  id: string;
  name: string;
  email: string;
  password: string;
  salt: string;
}

export interface IUserInputDTO {
  name: string;
  email: string;
  password: string;
}
