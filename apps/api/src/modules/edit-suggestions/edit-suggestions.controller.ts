import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from 'src/common/guard/admin.guard';
import { CreateEditSuggestionDto } from './dto/create-edit-suggestion.dto';
import { ReviewEditSuggestionDto } from './dto/review-edit-suggestion.dto';
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

@Controller('edit-suggestions')
export class EditSuggestionReviewController {
  constructor(
    private readonly editSuggestionsService: EditSuggestionsService,
  ) {}

  @Get('admin/queue')
  @UseGuards(AuthGuard('jwt-at'), AdminGuard)
  getAdminQueue() {
    return this.editSuggestionsService.getAdminQueue();
  }

  @Get('vendor/inbox')
  @UseGuards(AuthGuard('jwt-at'))
  getVendorInbox(@Request() request: AuthenticatedRequest) {
    return this.editSuggestionsService.getVendorInbox(request.user.userId);
  }

  @Patch(':suggestionId/apply')
  @UseGuards(AuthGuard('jwt-at'))
  apply(
    @Param('suggestionId') suggestionId: string,
    @Body() dto: ReviewEditSuggestionDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.editSuggestionsService.apply(
      request.user.userId,
      suggestionId,
      dto.reason?.trim(),
    );
  }

  @Patch(':suggestionId/discard')
  @UseGuards(AuthGuard('jwt-at'))
  discard(
    @Param('suggestionId') suggestionId: string,
    @Body() dto: ReviewEditSuggestionDto,
    @Request() request: AuthenticatedRequest,
  ) {
    return this.editSuggestionsService.discard(
      request.user.userId,
      suggestionId,
      dto.reason?.trim(),
    );
  }
}
