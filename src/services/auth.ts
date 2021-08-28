import { Service, Inject } from 'typedi';
import jwt, { sign } from 'jsonwebtoken';
import MailerService from './mailer';
import config from '../config';
import argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { IUser, IUserInputDTO } from '../interfaces/IUser';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';
import { nanoid } from 'nanoid';
import { wallet } from '@/interfaces/IWallet';
import axios from 'axios';
import * as ethUtil from 'ethereumjs-util';
import * as sigUtil from 'eth-sig-util';
import { ethers } from 'ethers';
const isValidSignature = require('is-valid-signature');

@Service()
export default class AuthService {
  constructor(
    @Inject('userModel') private userModel: Models.UserModel,
    private mailer: MailerService,
    @Inject('logger') private logger,
    @Inject('web3') private web3,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {}

  public async SignUp(userInputDTO: IUserInputDTO): Promise<{ user: IUser; token: string }> {
    try {
      // Check if user already exists
      this.logger.silly('Checking if user already exists');
      let check = await this.userModel.find({ paymentAddress: userInputDTO.paymentAddress }).lean().exec();
      if (check.length > 0) {
        throw new Error('user already exists');
      }
      // Generate userID
      this.logger.silly('Generating userID');
      const userID = nanoid(32);
      // Generate new wallet used to store NFTS
      this.logger.silly('Creating new wallet to hold NFTS');
      const newWallet: wallet = this.web3.eth.accounts.create();
      // Add funds to cover gas fees
      const maticPricing = await axios.get(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=MATIC&CMC_PRO_API_KEY=' +
          config.cmcProAPIKey,
      );
      const maticPrice = maticPricing.data.data.MATIC.quote.USD.price;
      const initialFundingValueMATIC =
        (config.initialGasFeeFundingCoverageUSD / maticPrice).toString().replace('.', '') + '00';
      // Get gas pricing
      const priorityFees = await axios.get('https://gasstation-mainnet.matic.network');
      const estBaseGas = await this.web3.eth.estimateGas({
        to: newWallet.address,
        value: initialFundingValueMATIC,
      });
      // Send transfer transaction
      const totalGas = estBaseGas + priorityFees.data.standard;
      const transaction = await this.web3.eth.accounts.signTransaction(
        {
          from: config.GAS_FEE_COVER_PUB_KEY,
          to: newWallet.address,
          nonce: await this.web3.eth.getTransactionCount(config.GAS_FEE_COVER_PUB_KEY, 'pending'), // Get count of all transactions sent to the contract from this address including pending ones
          value: initialFundingValueMATIC, // This is in matic so this is 1 matic because of the 18 decimals
          // maxPriorityFee: priorityFees.data.average, Not supported on Polygon MATIC yet
          gas: Math.round(totalGas).toString(),
          gasPrice: await this.web3.eth.getGasPrice(),
        },
        config.GAS_FEE_COVER_PRV_KEY,
      );
      this.logger.silly('Sent assets to cover gas fees');
      // Send the transaction that we signed
      this.web3.eth.sendSignedTransaction(transaction.raw || transaction.rawTransaction);
      // Encrypt wallet private key
      this.logger.silly("Encrypting new wallet's private keys for database storage");
      const wallet_pk_salt = randomBytes(32);
      const encrypted_private_key = await this.web3.eth.accounts.encrypt(
        newWallet.privateKey,
        userID + config.wallet_private_key_encryption_key,
      );
      // Create database record
      this.logger.silly('Creating user db record');
      const userRecord = await this.userModel.create({
        ...userInputDTO,
        id: userID,
        walletPrivateKey: encrypted_private_key,
        walletAddress: newWallet.address,
        walletPrivateKeySalt: wallet_pk_salt,
        nonce: nanoid(32),
      });
      // Generate JWT for authentication
      this.logger.silly('Generating JWT');
      const token = this.generateToken(userRecord);

      if (!userRecord) {
        throw new Error('User cannot be created');
      }
      this.logger.silly('Sending welcome email');
      await this.mailer.SendWelcomeEmail(userRecord);

      this.eventDispatcher.dispatch(events.user.signUp, { user: userRecord });

      /**
       * @TODO This is not the best way to deal with this
       * There should exist a 'Mapper' layer
       * that transforms data from layer to layer
       * but that's too over-engineering for now
       */
      const user = userRecord.toObject();
      Reflect.deleteProperty(user, 'password');
      Reflect.deleteProperty(user, 'walletPrivateKeySalt');
      Reflect.deleteProperty(user, 'walletPrivateKey');
      Reflect.deleteProperty(user, 'salt');
      return { user, token };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async SignIn(signature: string, publicAddress: string): Promise<{ userObj: any; token: string }> {
    const user: IUser = await this.userModel.findOne({ paymentAddress: publicAddress });
    if (!user) {
      throw new Error('User not registered');
    }
    /**
     * We use verify from argon2 to prevent 'timing based' attacks
     */
    this.logger.silly('Checking signature');

    const msg = `I am signing my one-time nonce: ${user.nonce}`;

    const msgBufferHex = ethUtil.bufferToHex(Buffer.from(msg, 'utf8'));
    const address = sigUtil.recoverPersonalSignature({
      data: msgBufferHex,
      sig: signature,
    });
    if (address == user.paymentAddress) {
      // Reroll nonce
      this.userModel.updateOne(
        { paymentAddress: user.paymentAddress },
        {
          nonce: nanoid(32), // Regenerate nonce so the same nonce can't be used again
        },
      );
      this.logger.silly('Signature is valid!');
      this.logger.silly('Generating JWT');
      const token = this.generateToken(user);
      //@ts-ignore
      const userObj = user.toObject();
      Reflect.deleteProperty(user, 'password');
      Reflect.deleteProperty(user, 'salt');
      Reflect.deleteProperty(user, 'walletPrivateKeySalt');
      Reflect.deleteProperty(user, 'walletPrivateKey');
      return { userObj, token };
    } else {
      throw new Error('Invalid Signature');
    }
  }

  private generateToken(user: IUser) {
    const today = new Date();
    const exp = new Date(today);
    exp.setDate(today.getDate() + 60);

    /**
     * A JWT means JSON Web Token, so basically it's a json that is _hashed_ into a string
     * The cool thing is that you can add custom properties a.k.a metadata
     * Here we are adding the userId, role and name
     * Beware that the metadata is public and can be decoded without _the secret_
     * but the client cannot craft a JWT to fake a userId
     * because it doesn't have _the secret_ to sign it
     * more information here: https://softwareontheroad.com/you-dont-need-passport
     */
    this.logger.silly(`Sign JWT for userId: ${user.id}`);
    return jwt.sign(
      {
        id: user.id,
        name: user.name,
        exp: exp.getTime() / 1000,
        address: user.walletAddress,
      },
      config.jwtSecret,
    );
  }
}
