import { EventEmitter } from 'events';
import { Request, Response } from 'express';
import { VerboseRequestLoggerMiddleware } from './verbose-request-logger.middleware';

const info = jest.fn();

jest.mock('tslog', () => ({
  Logger: jest.fn().mockImplementation(() => ({ info })),
}));

describe('VerboseRequestLoggerMiddleware', () => {
  afterEach(() => {
    info.mockClear();
  });

  it('logs the request and JSON response when verbose logging is enabled', () => {
    const middleware = new VerboseRequestLoggerMiddleware({
      get: jest.fn().mockReturnValue('1'),
    } as never);
    const response = new EventEmitter() as Response & {
      json: jest.Mock;
      send: jest.Mock;
    };
    response.statusCode = 201;
    response.json = jest.fn();
    response.send = jest.fn();
    const request = {
      method: 'POST',
      originalUrl: '/api/locations?nearby=true',
      body: { name: 'Cafe' },
      query: { nearby: 'true' },
    } as Request;

    middleware.use(request, response, jest.fn());
    response.send({ success: true });
    response.emit('finish');

    expect(info).toHaveBeenNthCalledWith(
      1,
      '/api/locations?nearby=true',
      'input:',
      JSON.stringify({ body: { name: 'Cafe' }, query: { nearby: 'true' } }),
    );
    expect(info).toHaveBeenNthCalledWith(
      2,
      '/api/locations?nearby=true',
      'status=201',
      'output:',
      JSON.stringify({ success: true }),
    );
  });

  it('does not log when VERBOSE is 0', () => {
    const middleware = new VerboseRequestLoggerMiddleware({
      get: jest.fn().mockReturnValue('0'),
    } as never);
    const response = new EventEmitter() as Response & {
      json: jest.Mock;
      send: jest.Mock;
    };
    response.statusCode = 200;
    response.json = jest.fn();
    response.send = jest.fn();

    middleware.use(
      {
        method: 'GET',
        originalUrl: '/api/locations',
        body: undefined,
        query: {},
      } as Request,
      response,
      jest.fn(),
    );
    response.send({ success: true });
    response.emit('finish');

    expect(info).not.toHaveBeenCalled();
  });
});
