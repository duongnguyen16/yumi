import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PendingVendorRegistrationSchema } from './schemas/pending-vendor-registration.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'PendingVendorRegistration',
        schema: PendingVendorRegistrationSchema,
      },
    ]),
  ],
  exports: [MongooseModule],
})
export class VendorsModule {}
