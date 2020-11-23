export interface Connector {
  name: string;
}

export type TaskOperation = 'restart';

export type ConnectorsOperation = 'restartFailedTasks';
