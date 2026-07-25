import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { Logger } from 'tslog';

@Injectable()
export class VerboseRequestLoggerMiddleware implements NestMiddleware {
  private readonly loggers = new Map<string, Logger<unknown>>();

  constructor(private readonly configService: ConfigService) {}

  private logger(method: string) {
    const existing = this.loggers.get(method);
    if (existing) return existing;
    const logger = new Logger<unknown>({
      name: method,
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
    this.loggers.set(method, logger);
    return logger;
  }

  use(req: Request, res: Response, next: NextFunction) {
    if (this.configService.get<string>('VERBOSE') === '0') {
      next();
      return;
    }

    const endpoint = req.originalUrl;
    let output: unknown;
    const send = res.send.bind(res);
    const json = res.json.bind(res);

    this.logger(req.method).info(
      endpoint,
      'input:',
      JSON.stringify({ body: req.body, query: req.query }),
    );

    res.json = ((body: unknown) => {
      output = body;
      return json(body);
    }) as Response['json'];
    res.send = ((body: unknown) => {
      if (output === undefined) {
        output = body;
      }
      return send(body);
    }) as Response['send'];
    res.once('finish', () => {
      this.logger(req.method).info(
        endpoint,
        `status=${res.statusCode}`,
        'output:',
        JSON.stringify(output),
      );
    });

    next();
  }
}
