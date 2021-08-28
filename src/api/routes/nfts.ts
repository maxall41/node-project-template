import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { celebrate, Joi } from 'celebrate';
import { Logger } from 'winston';
import NFTService from '../../services/nfts';

const route = Router();

export default (app: Router) => {
  app.use('/nfts', route);

  route.post(
    '/mint',
    celebrate({
      body: Joi.object({
        token: Joi.string().required(),
        metadataUploadURL: Joi.required(),
        nftData: Joi.required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const nftServiceInstance = Container.get(NFTService);
        const waitTime = await nftServiceInstance.MintNFT(req.body.token, req.body.metadataUploadURL, req.body.nftData);
        return res
          .json({
            result: waitTime,
          })
          .status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/getNFTSOwnedByAccount',
    celebrate({
      body: Joi.object({
        userID: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const nftServiceInstance = Container.get(NFTService);
        const result = await nftServiceInstance.getNFTSOwnedByAccount(req.body.userID);
        return res.json(result).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/getTransactionStatus',
    celebrate({
      body: Joi.object({
        txnHash: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const nftServiceInstance = Container.get(NFTService);
        const result = await nftServiceInstance.getTransactionStatusAndUpdate(req.body.txnHash);
        return res.json(result).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/sellNFT',
    celebrate({
      body: Joi.object({
        id: Joi.string().required(),
        price: Joi.number().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const nftServiceInstance = Container.get(NFTService);
        const result = await nftServiceInstance.sellNFT(req.body.id, req.body.price);
        return res.json(result).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/purchaseNFT',
    celebrate({
      body: Joi.object({
        id: Joi.string().required(),
        txnHash: Joi.string().required(),
        nftDestAddress: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const nftServiceInstance = Container.get(NFTService);
        await nftServiceInstance.purchaseNFT(req.body.id, req.body.txnHash, req.body.nftDestAddress);
        return res
          .json({
            result: 'Acknowledged',
          })
          .status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/getNFT',
    celebrate({
      body: Joi.object({
        id: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const nftServiceInstance = Container.get(NFTService);
        const result = await nftServiceInstance.getNFT(req.body.id);
        return res.json(result).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
