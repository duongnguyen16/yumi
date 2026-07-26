import { Module } from '@nestjs/common';
import { OwnershipImagesController } from './ownership-images.controller';
import { OwnershipImagesService } from './ownership-images.service';

@Module({
  controllers: [OwnershipImagesController],
  providers: [OwnershipImagesService],
})
export class OwnershipImagesModule {}
