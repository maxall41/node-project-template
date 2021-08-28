import { Container } from 'typedi';
import MailerService from '../services/mailer';
import { Logger } from 'winston';
import { IUser } from '../interfaces/IUser';
import config from '../config';
import axios from 'axios';

export default class CoverGasFeesForUserJob {
  public async handler(job, done): Promise<void> {
    const Logger: Logger = Container.get('logger');
    const web3: any = Container.get('web3');
    const user = job.attrs.data.user;
    const balance = await web3.eth.getBalance(user.walletAddress);
    try {
      const maticPricing = await axios.get(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=MATIC&CMC_PRO_API_KEY=' +
          config.cmcProAPIKey,
      );
      const maticPrice = maticPricing.data.data.MATIC.quote.USD.price;
      const initialFundingValueMATIC =
        (config.initialGasFeeFundingCoverageUSD / maticPrice).toString().replace('.', '') + '00';

      if (balance < parseInt(initialFundingValueMATIC) / 2) {
        //TODO: Move this into a service
        const maticPricing = await axios.get(
          'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=MATIC&CMC_PRO_API_KEY=' +
            config.cmcProAPIKey,
        );
        const maticPrice = maticPricing.data.data.MATIC.quote.USD.price;
        const initialFundingValueMATIC =
          (config.initialGasFeeFundingCoverageUSD / maticPrice).toString().replace('.', '') + '00';
        // Get gas pricing
        const priorityFees = await axios.get('https://gasstation-mainnet.matic.network');
        const estBaseGas = await web3.eth.estimateGas({
          to: user.walletAddress,
          value: initialFundingValueMATIC,
        });
        // Send transfer transaction
        const totalGas = estBaseGas + priorityFees.data.standard;
        const transaction = await web3.eth.accounts.signTransaction(
          {
            from: config.GAS_FEE_COVER_PUB_KEY,
            to: user.walletAddress,
            nonce: await web3.eth.getTransactionCount(config.GAS_FEE_COVER_PUB_KEY, 'pending'), // Get count of all transactions sent to the contract from this address including pending ones
            value: initialFundingValueMATIC, // This is in matic so this is 1 matic because of the 18 decimals
            // maxPriorityFee: priorityFees.data.average, Not supported on Polygon MATIC yet
            gas: Math.round(totalGas).toString(),
            gasPrice: await web3.eth.getGasPrice(),
          },
          config.GAS_FEE_COVER_PRV_KEY,
        );
        Logger.silly('Sent gas for user ' + user.id + ' At value USD: ' + config.initialGasFeeFundingCoverageUSD);
        // Send the transaction that we signed
        await web3.eth.sendSignedTransaction(transaction.raw || transaction.rawTransaction);
      } else {
        Logger.silly('Gas not required for user ' + user.id);
      }
      done();
    } catch (e) {
      Logger.error('🔥 Error with Cover Gas Fees For User Job: %o', e);
      done(e);
    }
  }
}
