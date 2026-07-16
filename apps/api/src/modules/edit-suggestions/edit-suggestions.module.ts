import { Module } from '@nestjs/common';
import { SchemaModule } from 'src/common/schemas/schema.module';
import {
  EditSuggestionReviewController,
  EditSuggestionsController,
} from './edit-suggestions.controller';
import { EditSuggestionApplyService } from './edit-suggestion-apply.service';
import { EditSuggestionRoutingService } from './edit-suggestion-routing.service';
import { EditSuggestionsService } from './edit-suggestions.service';

@Module({
  imports: [SchemaModule],
  controllers: [EditSuggestionsController, EditSuggestionReviewController],
  providers: [
    EditSuggestionsService,
    EditSuggestionRoutingService,
    EditSuggestionApplyService,
  ],
})
export class EditSuggestionsModule {}
