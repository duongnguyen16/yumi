import { Module } from '@nestjs/common';
import { SchemaModule } from 'src/common/schemas/schema.module';
import { EditSuggestionsController } from './edit-suggestions.controller';
import { EditSuggestionsService } from './edit-suggestions.service';

@Module({
  imports: [SchemaModule],
  controllers: [EditSuggestionsController],
  providers: [EditSuggestionsService],
})
export class EditSuggestionsModule {}
