import { Service, Inject } from 'typedi';
import MailerService from './mailer';
import config from '../config';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import axios from 'axios';
const isValidSignature = require('is-valid-signature');

@Service()
export default class PriceInfoService {
  constructor(
    @Inject('userModel') private userModel: Models.UserModel,
    private mailer: MailerService,
    @Inject('logger') private logger,
    @Inject('web3') private web3,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {}

  public async GetETHPriceRelMatic(): Promise<number> {
    try {
      const ethPriceQuery = await axios.get(
        'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?CMC_PRO_API_KEY=' +
          config.cmcProAPIKey +
          '&convert=MATIC&symbol=ETH',
      );
      return ethPriceQuery.data.data.ETH.quote.MATIC.price;
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}
