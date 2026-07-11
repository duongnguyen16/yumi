import { Module } from '@nestjs/common';
import { SchemaModule } from '../schemas/schema.module';
import { AuditService } from './audit.service';

@Module({
  imports: [SchemaModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
