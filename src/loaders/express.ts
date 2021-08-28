import express from 'express';
import cors from 'cors';
import routes from '../api/index';
import config from '../config/index';
import { isCelebrateError } from 'celebrate' 
import { print } from 'graphql';
export default ({ app }: { app: express.Application }) => {
  /**
   * Health Check endpoints
   * @TODO Explain why they are here
   */
  app.get('/status', (req, res) => {
    res.status(200).end();
  });
  app.head('/status', (req, res) => {
    res.status(200).end();
  });

  // Useful if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
  // It shows the real origin IP in the heroku or Cloudwatch logs
  app.enable('trust proxy');

  // The magic package that prevents frontend developers going nuts
  // Alternate description:
  // Enable Cross Origin Resource Sharing to all origins by default
  //TODO: Replace with actual domain | THIS IS VERY UNSECURE!!!
  app.use(cors());

  // Some sauce that always add since 2014
  // "Lets you use HTTP verbs such as PUT or DELETE in places where the client doesn't support it."
  // Maybe not needed anymore ?
  app.use(require('method-override')());

  // Transforms the raw string of req.body into json
  app.use(express.json());
  // Load API routes
  app.use(config.api.prefix, routes());

  /// catch 404 and forward to error handler
  app.use((req, res, next) => {
    const err = new Error('Not Found');
    err['status'] = 404;
    next(err);
  });

  /// error handlers
  app.use((err, req, res, next) => {
    /**
     * Handle 401 thrown by express-jwt library
     */
    if (err.name === 'UnauthorizedError') {
      return res
        .status(err.status)
        .send({ message: err.message })
        .end();
    }
    return next(err);
  });
  // Handle validation errors
  app.use((err, req, res, next) => {
    if (isCelebrateError(err)) {
      const errorBody = err.details.get('body'); // 'details' is a Map()
      const {
        details: [errorDetails],
      } = errorBody;
      return res.send({
        statusCode: 400,
        error: errorDetails,
      });
    }

    return next(err);
  });
  // Handle general errors
  app.use((err, req, res, next) => {
    res.json({
      errors: {
        message: err.message,
      },
    });
  });
};
