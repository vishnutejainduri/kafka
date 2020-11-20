import { HttpService, Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class BindingService {
  constructor(private httpService: HttpService) { }
  async getConfigs(env): Promise<{ [key: string]: any }> {
    const bindingUrls = {
      development: process.env.BINDING_URL_DEVELOPMENT,
      staging: process.env.BINDING_URL_STAGING,
      production: process.env.BINDING_URL_PRODUCTION
    }
    return this.httpService.get(`${bindingUrls[env]}/configs`, { headers: { Authorization: process.env.BINDING_AUTHORIZATION } })
      .pipe(map(({ data }) => data))
  }
}
