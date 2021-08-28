import { Router } from 'express';
import auth from './routes/auth';
import user from './routes/user';
import nfts from './routes/nfts';
import priceInfo from './routes/priceInfo';
import agendash from './routes/agendash';

// guaranteed to get dependencies
export default () => {
  const app = Router();
  auth(app);
  user(app);
  nfts(app);
  priceInfo(app);
  agendash(app);

  return app;
};
