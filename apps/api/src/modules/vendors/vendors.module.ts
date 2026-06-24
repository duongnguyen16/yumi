import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VendorProfileSchema } from './schemas/vendor-profile.schema';
import { PendingVendorRegistrationSchema } from './schemas/pending-vendor-registration.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'VendorProfile', schema: VendorProfileSchema },
      { name: 'PendingVendorRegistration', schema: PendingVendorRegistrationSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class VendorsModule {}