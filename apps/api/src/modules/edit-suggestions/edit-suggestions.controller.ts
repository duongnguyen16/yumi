import { Body, Controller, Param, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateEditSuggestionDto } from './dto/create-edit-suggestion.dto';
import { EditSuggestionsService } from './edit-suggestions.service';

type AuthenticatedRequest = Request & { user: { userId: string } };

@Controller('locations/:locationId/edit-suggestions')
export class EditSuggestionsController {
  constructor(
    private readonly editSuggestionsService: EditSuggestionsService,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt-at'))
  create(
    @Param('locationId') locationId: string,
    @Body() dto: CreateEditSuggestionDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.editSuggestionsService.create(
      request.user.userId,
      locationId,
      dto,
    );
  }
}
