import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';

@Injectable()
export class AuthorizationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: Function) {
    if (req.headers.authorization && req.headers.authorization === process.env.AUTHORIZATION_HEADER) {
      next();
    } else {
      res.status(401).end()
    }
  }
}
