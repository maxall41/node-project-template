import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import UserService from '../../services/user';
import { celebrate, Joi } from 'celebrate';
import { Logger } from 'winston';

const route = Router();

export default (app: Router) => {
  app.use('/user', route);

  route.post(
    '/deleteAccount',
    celebrate({
      body: Joi.object({
        id: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const userServiceInstance = Container.get(UserService);
        const ad = await userServiceInstance.DeleteAccount(req.body.id);
        return res.json({ ad }).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/getUser',
    celebrate({
      body: Joi.object({
        id: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const userServiceInstance = Container.get(UserService);
        const { user } = await userServiceInstance.GetUser(req.body.id);
        return res.json({ user }).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/getUserFromPubKey',
    celebrate({
      body: Joi.object({
        publicKey: Joi.string().required(),
      }),
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      const logger: Logger = Container.get('logger');
      try {
        const userServiceInstance = Container.get(UserService);
        const { user } = await userServiceInstance.GetUserFromPublicKey(req.body.publicKey);
        return res.json({ user }).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
