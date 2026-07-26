import { Module } from '@nestjs/common';
import { OwnershipImagesService } from './ownership-images.service';

@Module({
  providers: [OwnershipImagesService],
  exports: [OwnershipImagesService],
})
export class OwnershipImagesModule {}
