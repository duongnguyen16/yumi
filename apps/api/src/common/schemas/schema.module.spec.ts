import { MODULE_METADATA } from '@nestjs/common/constants';
import { ClaimVerificationSession } from './claim-verification-session.schema';
import { SchemaModule } from './schema.module';

describe('SchemaModule', () => {
  it('registers the claim verification session model', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, SchemaModule);
    expect(JSON.stringify(imports)).toContain(ClaimVerificationSession.name);
  });
});
