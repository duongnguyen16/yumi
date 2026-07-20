import type {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { Logger } from 'tslog';

const isVerbose = process.env.NEXT_PUBLIC_VERBOSE !== '0';
const loggers = new Map<string, Logger<unknown>>();

function endpoint(config: InternalAxiosRequestConfig | undefined) {
  return `${config?.baseURL ?? ''}${config?.url ?? ''}`;
}

function logger(method: string | undefined) {
  const name = method?.toUpperCase() ?? 'HTTP';
  const existing = loggers.get(name);
  if (existing) return existing;
  const instance = new Logger<unknown>({
    name,
    type: 'pretty',
    stylePrettyLogs: true,
    prettyLogTemplate: '{{logLevelName}} {{name}}\t',
    prettyLogStyles: {
      name: {
        GET: ['bold', 'cyan'],
        POST: ['bold', 'green'],
        PUT: ['bold', 'yellow'],
        PATCH: ['bold', 'magenta'],
        DELETE: ['bold', 'red'],
      },
    },
  });
  loggers.set(name, instance);
  return instance;
}

export function logApiInput(config: InternalAxiosRequestConfig) {
  if (!isVerbose) return;
  logger(config.method).info(endpoint(config), 'input:', JSON.stringify(config.data));
}

export function logApiOutput(response: AxiosResponse) {
  if (!isVerbose) return;
  logger(response.config.method).info(
    endpoint(response.config),
    `status=${response.status}`,
    'output:',
    JSON.stringify(response.data),
  );
}

export function logApiError(error: AxiosError) {
  if (!isVerbose) return;
  logger(error.config?.method).info(
    endpoint(error.config),
    `status=${error.response?.status ?? 'network-error'}`,
    'output:',
    JSON.stringify(error.response?.data),
  );
}
