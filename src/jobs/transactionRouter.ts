import { Container } from 'typedi';
import BigNumber from 'bignumber.js';
import { Logger } from 'winston';
import axios from 'axios';
import config from '../config/index';
import { wallet } from '../interfaces/IWallet';
import { IUser } from '../interfaces/IUser';
import { transactionRaw } from '../interfaces/INFT';
import NFTService from '../services/nfts';
const ObjectID = require('mongodb').ObjectID;

export default class TransactionRouterJob {
  public async handler(job, done): Promise<void> {
    const agenda: any = Container.get('agendaInstance');
    const Logger: Logger = Container.get('logger');
    const web3: any = Container.get('web3');
    try {
      Logger.debug('✌️ Transaction Router Job triggered!');
      //TODO: Put this in service
      const user: IUser = job.attrs.data.user;
      const incomingTransactionPrice = new BigNumber(job.attrs.data.incomingTransactionPrice); // This is in WEI
      const outgoingFeePrice = incomingTransactionPrice.multipliedBy(0.275).integerValue();
      const outgoingArtistPayment = incomingTransactionPrice.minus(outgoingFeePrice);
      const assetTransferHash = job.attrs.data.assetTransferHash;

      const nftServiceInstance = Container.get(NFTService);
      let assetTransaction: transactionRaw = await nftServiceInstance.getTransactionStatusRAW(assetTransferHash);
      if (assetTransaction.pending == false) {
        Logger.silly('Transaction: ' + assetTransferHash + ' Has been mined!');
        // Send 2.75% fee
        // Decrypt NFT holding wallet
        const wallet: wallet = web3.eth.accounts.decrypt(
          user.walletPrivateKey,
          user.id + config.wallet_private_key_encryption_key,
        );
        // Get gas priority fee
        const gasPricing = await axios.get('https://gasstation-mainnet.matic.network');
        const average: number = gasPricing.data.standard;
        // Get gas base price
        let gasBaseFeeToBryght = await web3.eth.estimateGas({
          to: config.ethPaymentAddress,
        });
        const transfer = await web3.eth.accounts.signTransaction(
          {
            from: user.walletAddress,
            to: config.ethPaymentAddress,
            nonce: await web3.eth.getTransactionCount(user.walletAddress, 'pending'), // Get count of all transactions sent to the contract from this address including pending ones
            gas: Math.round(gasBaseFeeToBryght + average), // Polygon does not support EIP1559
            value: outgoingFeePrice,
          },
          wallet.privateKey,
        );
        // Send the transaction that we signed
        web3.eth.sendSignedTransaction(transfer.raw || transfer.rawTransaction);
        Logger.silly('Sent fee payment hash: ');
        console.log(transfer);

        // Send artist payment
        // Get gas base price
        let gasBaseFeeToArtist = await web3.eth.estimateGas({
          to: user.paymentAddress,
        });
        const transferToArtist = await web3.eth.accounts.signTransaction(
          {
            from: user.walletAddress,
            to: user.paymentAddress,
            nonce: await web3.eth.getTransactionCount(user.walletAddress, 'pending'), // Get count of all transactions sent to the contract from this address including pending ones
            gas: gasBaseFeeToArtist + average, // Polygon does not support EIP-1559
            value: outgoingArtistPayment,
          },
          wallet.privateKey,
        );
        // Send the transaction that we signed
        web3.eth.sendSignedTransaction(transferToArtist.raw || transferToArtist.rawTransaction);
        Logger.silly('Sent artist payment hash: ');
        console.log(transferToArtist);
        //Removes this reoccurring job
        agenda.cancel(
          {
            _id: ObjectID(job.attrs._id),
          },
          (err, numRemoved) => {
            if (err) {
              console.log(err);
            } else {
              console.log(`removed ${numRemoved} jobs`);
            }
          },
        );
      } else {
        Logger.silly('Transaction for payment router: ' + assetTransferHash + ' is still pending');
      }

      done();
    } catch (e) {
      Logger.error('🔥 Error with Transaction Router Job: %o', e);
      done(e);
    }
  }
}
