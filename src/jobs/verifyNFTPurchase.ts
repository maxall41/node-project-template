import { INFT, transactionRaw } from '../interfaces/INFT';
import { Container } from 'typedi';
import { Logger } from 'winston';
import NFTService from '../services/nfts';
import axios from 'axios';
import { IUser } from '../interfaces/IUser';
import pendingPurchases from '../models/pendingPurchases';
import { IPurchase, PendingPurchaseStatus } from '../interfaces/PendingPurchase';
import config from '../config/index';
import { wallet } from '@/interfaces/IWallet';
const ObjectID = require('mongodb').ObjectID;
export default class NFTPurchaseVerificationJob {
  public async handler(job, done): Promise<void> {
    const agenda: any = Container.get('agendaInstance');
    const Logger: Logger = Container.get('logger');
    const web3: any = Container.get('web3');
    try {
      Logger.debug('✌️ NFT Purchase Verifier Job triggered!');
      const nft: INFT = job.attrs.data.nft;
      const transactionHash = job.attrs.data.transactionHash;
      const user: IUser = job.attrs.data.user;
      const nftDestAddress: string = job.attrs.data.nftDestAddress;
      const nftServiceInstance = Container.get(NFTService);

      //TODO: Move all of this into service
      let transaction: transactionRaw = await nftServiceInstance.getTransactionStatusRAW(transactionHash);
      if (transaction.pending == false) {
        Logger.info('NFT Purchase: ' + nft.txnHash + ' Mined');
        // Check for fraud

        // Make sure transaction is going to right address
        if (transaction.transaction.to != user.walletAddress) {
          Logger.warn('Fraud detected for transaction: ' + nft.txnHash + ' type: Incorrect address');
          pendingPurchases.updateOne(
            {
              id: nft.id,
            },
            {
              status: PendingPurchaseStatus.fraud,
            },
          );
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
          // Make sure transaction is of correct amount
          const validTransferAmountWEI = nft.priceInWEI;
          if (parseInt(transaction.transaction.value) < validTransferAmountWEI) {
            Logger.warn('Fraud detected for transaction: ' + nft.txnHash + ' type: Incorrect amount');
            pendingPurchases.updateOne(
              {
                id: nft.id,
              },
              {
                status: PendingPurchaseStatus.fraud,
              },
            );
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
            pendingPurchases.updateOne(
              {
                id: nft.id,
              },
              {
                status: PendingPurchaseStatus.completed,
              },
            );
            //Transfer NFT to purchaser
            const wallet: wallet = web3.eth.accounts.decrypt(
              user.walletPrivateKey,
              user.id + config.wallet_private_key_encryption_key,
            );
            // Init contract
            const contractABI = require('../../contract-abi.json');
            const contractAddress = config.mintingContractAddress;
            const contract = await new web3.eth.Contract(contractABI, contractAddress);
            // Transfer contract
            const transfer = contract.methods
              .safeTransferFrom(user.walletAddress, nftDestAddress, nft.tokenID)
              .encodeABI();
            // Get gas priority fee
            const gasPricing = await axios.get('https://gasstation-mainnet.matic.network');
            const average: number = gasPricing.data.standard;
            // Get gas base price
            let gasBaseFee = await web3.eth.estimateGas({
              to: contractAddress,
              data: transfer,
            });
            const transferNFT = await web3.eth.accounts.signTransaction(
              {
                from: user.walletAddress,
                to: contractAddress,
                nonce: await web3.eth.getTransactionCount(user.walletAddress, 'pending'), // Get count of all transactions sent to the contract from this address including pending ones
                data: transfer,
                gas: Math.round(gasBaseFee + average), // Polygon does not support EIP1559
              },
              wallet.privateKey,
            );
            // Send the transaction that we signed
            web3.eth.sendSignedTransaction(transferNFT.raw || transferNFT.rawTransaction);
            Logger.silly(transferNFT);
            Logger.info('Transaction: ' + transactionHash + ' has been fully processed without error');
            //Engage transaction fund router
            agenda.every('10 seconds', 'transaction-router', {
              incomingTransactionPrice: Math.round(parseInt(transaction.transaction.value)).toString(),
              assetTransferHash: transactionHash,
              user: user,
            });
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
          }
        }
      } else {
        Logger.info('NFT Purchase: ' + nft.txnHash + ' Still pending');
      }

      done();
    } catch (e) {
      Logger.error('🔥 Error with Purchase Verification Job: %o', e);
      done(e);
    }
  }
}
