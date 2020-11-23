import { HttpException, HttpService, Injectable } from '@nestjs/common';
import { catchError, map } from 'rxjs/operators';

@Injectable()
export class BindingService {
  constructor(private httpService: HttpService) {}
  async getConfigs(env) {
    const bindingUrls = {
      development: process.env.BINDING_URL_DEVELOPMENT,
      staging: process.env.BINDING_URL_STAGING,
      production: process.env.BINDING_URL_PRODUCTION,
    };
    return this.httpService
      .get(`${bindingUrls[env]}/configs`, {
        headers: {
          Authorization: process.env.BINDING_AUTHORIZATION_DEVELOPMENT,
        },
        validateStatus: function (status) {
          return status >= 200 && status < 300; // Resolve only if the status code is less than 500
        },
      })
      .pipe(
        catchError(({ response, code }) => {
          const params: [any, any] =
            response && response.status >= 200 && response.status < 300
              ? [response.data, response.status]
              : [code, 500];
          throw new HttpException(...params);
        }),
      )
      .pipe(map(({ data }) => data));
  }
}
