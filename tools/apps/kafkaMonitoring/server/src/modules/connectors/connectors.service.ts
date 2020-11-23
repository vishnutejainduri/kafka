import { Injectable } from '@nestjs/common';
import { Connector } from './connectors.interface';
import * as getDebug from '../../../../../../kafka/debug';
import * as getKubeEnv from '../../../../../../kafka/lib/getKubeEnv';

type Environment = 'development' | 'staging' | 'production';

const connectionUrls: Record<Environment, string> = {
  production: process.env['JESTA_PRODUCTION'],
  staging: process.env['JESTA_STAGING'],
  development: process.env['JESTA_DEVELOPMENT'],
};

const debug = (env: Environment, command, options = []) =>
  getDebug({
    command,
    connectionUrl: connectionUrls[env],
    kubeParams: getKubeEnv(env),
    options,
  });

@Injectable()
export class ConnectorsService {
  async findAll(env): Promise<Connector[]> {
    if (!env) throw new Error('Environment not specified');
    const connectorsNames: string[] = await debug(env, 'getAll');
    return Promise.all(
      connectorsNames.map(async (name) => {
        const tasks = (await debug(env, 'getTasks', [name]))[0];
        return {
          name,
          tasks,
        };
      }),
    );
  }

  async restart(env, connectorName, taskId) {
    if (!env) throw new Error('Environment not specified');
    return debug(env, 'restartTask', [connectorName, taskId]);
  }

  async restartFailedTasks(env) {
    if (!env) throw new Error('Environment not specified');
    return debug(env, 'restartFailedTasks');
  }
}
