import { Module } from '@nestjs/common';
import { AppealImagesController, ImagesController } from './images.controller';
import { ImagesService } from './images.service';

@Module({
  controllers: [ImagesController, AppealImagesController],
  providers: [ImagesService],
  exports: [ImagesService],
})
export class ImagesModule {}
