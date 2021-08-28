import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import PriceInfoService from '../../services/priceInfo';
import { Logger } from 'winston';

const route = Router();

export default (app: Router) => {
  app.use('/priceInfo', route);

  route.post('/getETHPriceRelMatic', async (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = Container.get('logger');
    try {
      const pisServiceInstance = Container.get(PriceInfoService);
      const price = await pisServiceInstance.GetETHPriceRelMatic();
      return res.json(price).status(200);
    } catch (e) {
      logger.error('🔥 error: %o', e);
      return next(e);
    }
  });
};
