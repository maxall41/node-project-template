import config from '../config';
import welcomeFeedbackJob from '../jobs/welcomeFeedback';
import Agenda from 'agenda';
import NFTPurchaseVerificationJob from '../jobs/verifyNFTPurchase';
import TransactionRouter from '../jobs/transactionRouter';
import GasFeeCoveringJob from '../jobs/gasFeeCovering';
import CoverGasFeesForUserJob from '../jobs/coverGasFeesForUser';

export default ({ agenda }: { agenda: Agenda }) => {
  agenda.define(
    'send-welcome-feedback-email',
    { priority: 'low', concurrency: config.agenda.concurrency },
    // @TODO Could this be a static method? Would it be better?
    new welcomeFeedbackJob().handler,
  );

  agenda.define(
    'gas-fee-covering',
    { priority: 'normal', concurrency: config.agenda.concurrency },
    // @TODO Could this be a static method? Would it be better?
    new GasFeeCoveringJob().handler,
  );

  agenda.define(
    'cover-gas-fees-for-user',
    { priority: 'normal', concurrency: config.agenda.concurrency },
    // @TODO Could this be a static method? Would it be better?
    new CoverGasFeesForUserJob().handler,
  );

  agenda.define(
    'verify-nft-transaction',
    { priority: 'highest', concurrency: config.agenda.concurrency },
    // @TODO Could this be a static method? Would it be better?
    new NFTPurchaseVerificationJob().handler,
  );

  agenda.define(
    'transaction-router',
    { priority: 'highest', concurrency: config.agenda.concurrency },
    // @TODO Could this be a static method? Would it be better?
    new TransactionRouter().handler,
  );

  //TODO: Commented out because we do not yet have enough tokens to fund all accounts
  /**
   * Checks gas for all accounts and if an account does not have enough funds for 35 transactions at midnight we add more funding
   * The 35 number is because that is the maximum amount of transactions we allow users to complete in one day
   */
  // agenda.every('0 0 * * *', 'gas-fee-covering');

  agenda.start();
};
