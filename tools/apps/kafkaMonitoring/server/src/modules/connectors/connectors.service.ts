import { Injectable } from '@nestjs/common';
import { Connector } from './connector.interface';
import * as getDebug from '../../../../../../kafka/debug'
import * as getKubeEnv from '../../../../../../kafka/lib/getKubeEnv'

const connectionUrls = {
  'production': process.env['JESTA_PRODUCTION'],
  'staging': process.env['JESTA_STAGING'],
  'development': process.env['JESTA_DEVELOPMENT']
};

@Injectable()
export class ConnectorsService {
  async findAll(env = 'development'): Promise<Connector[]> {
    const debug = (command, options = []) => getDebug({
      command,
      connectionUrl: connectionUrls[env],
      kubeParams: getKubeEnv(env),
      options
    }).catch(console.error)

    const connectorsNames: string [] = await debug('getAll')
    return Promise.all(connectorsNames.map(async name => {
      const tasks = (await debug('getTasks', [name]))[0]
      return {
        name,
        tasks
      }
    }));
  }
}
