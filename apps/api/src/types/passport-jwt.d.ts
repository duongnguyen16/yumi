declare module 'passport-jwt' {
  import { Strategy as PassportStrategy } from 'passport';

  export interface StrategyOptionsWithRequest {
    jwtFromRequest: JwtFromRequestFunction;
    secretOrKey?: string | Buffer;
    secretOrKeyProvider?: SecretOrKeyProvider;
    issuer?: string | string[];
    audience?: string | string[];
    algorithms?: string[];
    ignoreExpiration?: boolean;
    passReqToCallback: true;
    jsonWebTokenOptions?: object;
  }

  export interface StrategyOptionsWithoutRequest {
    jwtFromRequest: JwtFromRequestFunction;
    secretOrKey?: string | Buffer;
    secretOrKeyProvider?: SecretOrKeyProvider;
    issuer?: string | string[];
    audience?: string | string[];
    algorithms?: string[];
    ignoreExpiration?: boolean;
    passReqToCallback?: false;
    jsonWebTokenOptions?: object;
  }

  export type StrategyOptions =
    StrategyOptionsWithRequest | StrategyOptionsWithoutRequest;

  export type SecretOrKeyProvider = (
    request: any,
    rawJwtToken: any,
    done: (err: any, secretOrKey?: string | Buffer) => void,
  ) => void;

  export type VerifiedCallback = (
    error: any,
    user?: object | false,
    info?: any,
  ) => void;

  export type JwtFromRequestFunction = (request: any) => string | null;

  export class Strategy extends PassportStrategy {
    constructor(
      opt: StrategyOptionsWithRequest,
      verify: (req: any, payload: any, done: VerifiedCallback) => void,
    );
    constructor(
      opt: StrategyOptionsWithoutRequest,
      verify: (payload: any, done: VerifiedCallback) => void,
    );
  }

  export namespace ExtractJwt {
    function fromHeader(header_name: string): JwtFromRequestFunction;
    function fromBodyField(field_name: string): JwtFromRequestFunction;
    function fromUrlQueryParameter(param_name: string): JwtFromRequestFunction;
    function fromAuthHeaderWithScheme(
      auth_scheme: string,
    ): JwtFromRequestFunction;
    function fromAuthHeaderAsBearerToken(): JwtFromRequestFunction;
    function fromExtractors(
      extractors: JwtFromRequestFunction[],
    ): JwtFromRequestFunction;
  }
}
