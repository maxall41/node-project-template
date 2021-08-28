import { Service, Inject } from 'typedi';
import jwt, { JwtPayload } from 'jsonwebtoken';
import MailerService from './mailer';
import config from '../config/index';
import { IUser, IUserInputDTO, IUserJWT } from '../interfaces/IUser';
import { INFT, NFTStatus, transactionRaw } from '../interfaces/INFT';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import { transaction, wallet } from '@/interfaces/IWallet';
import axios from 'axios';
import { RelayProvider } from '@opengsn/provider';
import { nanoid } from 'nanoid';
import { PendingPurchaseStatus } from '../interfaces/PendingPurchase';

@Service()
export default class NFTService {
  constructor(
    @Inject('userModel') private userModel: Models.UserModel,
    @Inject('nftModel') private nftModel: Models.NFTModel,
    @Inject('purchaseModel') private purchaseModel: Models.PurchaseModel,
    private mailer: MailerService,
    @Inject('logger') private logger,
    @Inject('web3') private web3,
    @Inject('agendaInstance') private agenda,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {}

  public async getNFT(id: string): Promise<INFT> {
    return this.nftModel.findOne({ id: id }).lean().exec();
  }

  public async sellNFT(id: string, price: number): Promise<string> {
    const url = 'http://localhost:8080/purchase/nft/' + id;

    // Find price in ETHER & WEI
    const ethPriceQuery = await axios.get(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?CMC_PRO_API_KEY=' +
        config.cmcProAPIKey +
        '&convert=USD&symbol=ETH',
    );
    const ethPrice = ethPriceQuery.data.data.ETH.quote.USD.price;
    const priceInETHER = price / ethPrice;
    const priceInWEI = this.web3.utils.toWei(priceInETHER.toFixed(18).toString(), 'ether');
    // Update database
    await this.nftModel
      .updateOne(
        { id: id },
        {
          $set: {
            status: NFTStatus.selling,
            price: price,
            url: url,
            priceInWEI: priceInWEI,
            priceInETHER: priceInETHER,
          },
        },
      )
      .exec();
    return url;
  }

  public async purchaseNFT(id: string, txnHash: string, nftDestAddress: string) {
    const nft = await this.nftModel.findOne({ id: id }).lean().exec();
    const user = await this.userModel.findOne({ id: nft.userID }).lean().exec();
    await this.nftModel.updateOne(
      { id: id },
      {
        $set: { status: NFTStatus.sold },
        $unset: { price: '', priceInETHER: '', priceInWEI: '', url: '' },
      },
    );
    await this.purchaseModel.create({
      txnHash: txnHash,
      status: PendingPurchaseStatus.pending,
      id: nft.id,
    });
    this.agenda.every('10 seconds', 'verify-nft-transaction', {
      nft: nft,
      user: user,
      transactionHash: txnHash,
      nftDestAddress: nftDestAddress,
    });
  }

  public async getNFTSOwnedByAccount(userID: string): Promise<INFT[]> {
    try {
      const nfts: INFT[] = await this.nftModel.find({ userID: userID });
      nfts.forEach(async (nft: INFT) => {
        nft.status = await this.getTransactionStatusAndUpdate(nft.txnHash);
      });
      console.log(nfts);
      return nfts;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async getTransactionStatusAndUpdate(transactionHash: string): Promise<NFTStatus> {
    try {
      const transaction = await this.web3.eth.getTransactionReceipt(transactionHash);
      if (transaction == null) {
        return NFTStatus.pending;
      } else {
        const databaseStatus = await (await this.nftModel.findOne({ txnHash: transactionHash })).status;
        if (databaseStatus == NFTStatus.selling) {
          return NFTStatus.selling;
        } else if (databaseStatus == NFTStatus.holding) {
          return NFTStatus.holding;
        } else if (databaseStatus == NFTStatus.pending) {
          // Update database with new status
          await this.nftModel.updateOne(
            { txnHash: transactionHash },
            {
              $set: { status: NFTStatus.holding },
            },
          );
          return NFTStatus.holding;
        }
      }
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async getTransactionStatusRAW(transactionHash: string): Promise<transactionRaw> {
    try {
      if ((await this.web3.eth.getTransactionReceipt(transactionHash)) != null) {
        const transaction = await this.web3.eth.getTransaction(transactionHash);
        return {
          transaction: transaction,
          pending: false,
        };
      } else {
        return {
          transaction: null,
          pending: true,
        };
      }
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async MintNFT(token: string, metadataUploadURL: string, nftData: object): Promise<number> {
    try {
      // Get user
      const userJWT: IUserJWT = jwt.verify(token, config.jwtSecret) as IUserJWT;
      const user: IUser = await this.userModel.findOne({ id: userJWT.id }).lean().exec();
      // Get user wallet
      const wallet: wallet = this.web3.eth.accounts.decrypt(
        user.walletPrivateKey,
        user.id + config.wallet_private_key_encryption_key,
      );
      // Init contract
      const contractABI = require('../../contract-abi.json');
      const contractAddress = config.mintingContractAddress;
      const contract = await new this.web3.eth.Contract(contractABI, contractAddress);
      // Mint NFT
      const nft = contract.methods.mintNFT(user.walletAddress, metadataUploadURL, user.paymentAddress, 0.0).encodeABI();
      // Get gas pricing
      const priorityFees = await axios.get('https://gasstation-mainnet.matic.network');
      const estBaseGas = await this.web3.eth.estimateGas({
        data: nft,
        to: contractAddress,
      });
      // Send NFT minting transaction
      const totalGas = estBaseGas + priorityFees.data.standard;
      const transaction = await this.web3.eth.accounts.signTransaction(
        {
          from: user.walletAddress,
          to: contractAddress,
          nonce: await this.web3.eth.getTransactionCount(user.walletAddress, 'pending'), // Get count of all transactions sent to the contract from this address including pending ones
          data: nft,
          // maxPriorityFee: priorityFees.data.average, Not supported on Polygon MATIC yet
          gas: Math.round(totalGas).toString(),
          gasPrice: await this.web3.eth.getGasPrice(),
        },
        wallet.privateKey,
      );
      this.logger.silly('Finished signing transaction');
      // Send the transaction that we signed
      this.web3.eth.sendSignedTransaction(transaction.raw || transaction.rawTransaction);
      this.logger.silly('Sent transaction');
      // Add listener
      contract.once('MintedNFT', (error, event) => {
        if (error != null) {
          this.logger.error(error);
        } else {
          // Add NFT to database
          this.nftModel.create({
            nftData: nftData,
            id: nanoid(),
            tokenID: event.returnValues.tokenID,
            txnHash: transaction.transactionHash,
            // tokenID: tokenID,
            metadataURL: metadataUploadURL,
            userID: user.id,
            status: NFTStatus.pending, // Start status at pending
          });
        }
      });
      // Return wait time for creating NFT on the blockchain
      return 5;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}
