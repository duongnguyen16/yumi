import { Module } from '@nestjs/common';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { TrustEngineService } from './trust-engine.service';

@Module({
  imports: [SchemaModule],
  providers: [TrustEngineService],
  exports: [TrustEngineService],
})
export class TrustEngineModule {}
