import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  EditSuggestionStatus,
  LocationStatus,
  RoutingTarget,
  UserRole,
  UserStatus,
} from 'src/common/schemas/common.enums';
import {
  LocationRequestStatus,
  LocationRequestType,
} from 'src/common/schemas/location-request';
import {
  EditSuggestionField,
  EditSuggestionFlag,
} from '../dto/create-edit-suggestion.dto';
import { EditSuggestionApplyService } from '../edit-suggestion-apply.service';
import { EditSuggestionRoutingService } from '../edit-suggestion-routing.service';
import { EditSuggestionsService } from '../edit-suggestions.service';

function query<T>(value: T) {
  return {
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}

function doc<T extends Record<string, unknown>>(value: T) {
  return {
    ...value,
    save: jest.fn().mockResolvedValue(value),
  };
}

describe('EditSuggestionsService', () => {
  const userId = new Types.ObjectId();
  const ownerId = new Types.ObjectId();
  const locationId = new Types.ObjectId();
  const suggestionId = new Types.ObjectId();

  function createService(options?: {
    user?: Record<string, unknown> | null;
    location?: Record<string, unknown> | null;
    suggestion?: Record<string, unknown> | null;
    reviewer?: Record<string, unknown> | null;
    pendingUpdate?: Record<string, unknown> | null;
  }) {
    const user =
      options && 'user' in options
        ? options.user
        : { _id: userId, status: UserStatus.ACTIVE };
    const location =
      options && 'location' in options
        ? options.location
        : doc({
            _id: locationId,
            ownerId,
            status: LocationStatus.PUBLISHED,
            name: 'Old name',
            address: 'Old address',
            openingHours: '08:00-17:00',
            phone: '0900000000',
            geo: { type: 'Point', coordinates: [106.67, 10.75] },
            isSuspectedDuplicate: false,
          });
    const suggestion =
      options && 'suggestion' in options
        ? options.suggestion
        : doc({
            _id: suggestionId,
            locationId,
            userId,
            fieldName: EditSuggestionField.OPENING_HOURS,
            oldValue: '08:00-17:00',
            newValue: { value: '09:00-18:00' },
            routingTarget: RoutingTarget.VENDOR,
            status: EditSuggestionStatus.PENDING,
          });
    const reviewer =
      options && 'reviewer' in options
        ? options.reviewer
        : { _id: ownerId, role: UserRole.VENDOR, status: UserStatus.ACTIVE };

    const editSuggestionModel = {
      insertMany: jest.fn().mockImplementation(async (items) =>
        items.map((item: Record<string, unknown>) => ({
          _id: new Types.ObjectId(),
          ...item,
        })),
      ),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
      findById: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(suggestion) }),
      updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
    };
    const locationModel = {
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
      findById: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(location),
      }),
    };
    const userModel = {
      findById: jest.fn().mockReturnValue(query(reviewer ?? user)),
    };
    const locationRequestModel = {
      findOne: jest.fn().mockReturnValue(query(options?.pendingUpdate ?? null)),
      create: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    };
    const notificationModel = {
      create: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    };
    const auditLogModel = {
      create: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    };
    const routingService = new EditSuggestionRoutingService(
      editSuggestionModel as never,
      locationModel as never,
      userModel as never,
    );
    const applyService = new EditSuggestionApplyService(
      locationRequestModel as never,
    );

    return {
      service: new EditSuggestionsService(
        editSuggestionModel as never,
        locationModel as never,
        userModel as never,
        notificationModel as never,
        auditLogModel as never,
        routingService,
        applyService,
      ),
      editSuggestionModel,
      locationModel,
      userModel,
      locationRequestModel,
      notificationModel,
      auditLogModel,
      location,
      suggestion,
    };
  }

  it('routes claimed suggestions to vendor and no-owner suggestions to admin', async () => {
    const claimed = createService({
      location: {
        _id: locationId,
        ownerId,
        status: LocationStatus.PUBLISHED,
        openingHours: '08:00-17:00',
        geo: { type: 'Point', coordinates: [106.67, 10.75] },
      },
      user: { _id: userId, status: UserStatus.ACTIVE },
    });
    claimed.userModel.findById.mockReturnValueOnce(query({ _id: userId, status: UserStatus.ACTIVE }));

    await claimed.service.create(String(userId), String(locationId), {
      changes: [
        {
          fieldName: EditSuggestionField.OPENING_HOURS,
          textValue: '09:00-18:00',
        },
      ],
    });

    expect(claimed.editSuggestionModel.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({ routingTarget: RoutingTarget.VENDOR }),
    ]);

    const noOwner = createService({
      location: {
        _id: locationId,
        ownerId: null,
        status: LocationStatus.PUBLISHED,
        openingHours: '08:00-17:00',
        geo: { type: 'Point', coordinates: [106.67, 10.75] },
      },
      user: { _id: userId, status: UserStatus.ACTIVE },
    });
    noOwner.userModel.findById.mockReturnValueOnce(query({ _id: userId, status: UserStatus.ACTIVE }));

    await noOwner.service.create(String(userId), String(locationId), {
      changes: [
        {
          fieldName: EditSuggestionField.OPENING_HOURS,
          textValue: '09:00-18:00',
        },
      ],
    });

    expect(noOwner.editSuggestionModel.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({ routingTarget: RoutingTarget.ADMIN }),
    ]);
  });

  it('applies a non-sensitive vendor suggestion and updates location info', async () => {
    const { service, location, suggestion } = createService();

    const result = await service.apply(String(ownerId), String(suggestionId));

    expect(location.openingHours).toBe('09:00-18:00');
    expect(location.save).toHaveBeenCalled();
    expect(suggestion.status).toBe(EditSuggestionStatus.APPLIED);
    expect(result).toMatchObject({
      success: true,
      result: { action: 'UPDATED' },
    });
  });

  it('sends sensitive name/address applies to re-approval without publishing the change', async () => {
    const location = doc({
      _id: locationId,
      ownerId,
      status: LocationStatus.PUBLISHED,
      name: 'Old name',
      address: 'Old address',
      geo: { type: 'Point', coordinates: [106.67, 10.75] },
    });
    const suggestion = doc({
      _id: suggestionId,
      locationId,
      userId,
      fieldName: EditSuggestionField.NAME,
      oldValue: 'Old name',
      newValue: { value: 'New name' },
      routingTarget: RoutingTarget.VENDOR,
      status: EditSuggestionStatus.PENDING,
    });
    const { service, locationRequestModel } = createService({
      location,
      suggestion,
    });

    const result = await service.apply(String(ownerId), String(suggestionId));

    expect(location.name).toBe('Old name');
    expect(location.status).toBe(LocationStatus.PENDING_RE_APPROVAL);
    expect(locationRequestModel.findOne).toHaveBeenCalledWith({
      locationId,
      type: LocationRequestType.UPDATE,
      status: {
        $in: [
          LocationRequestStatus.PENDING,
          LocationRequestStatus.PENDING_RE_APPROVAL,
        ],
      },
    });
    expect(locationRequestModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: LocationRequestType.UPDATE,
        status: LocationRequestStatus.PENDING_RE_APPROVAL,
        submittedBy: ownerId,
        locationId,
        oldData: { [EditSuggestionField.NAME]: 'Old name' },
        newData: expect.objectContaining({
          [EditSuggestionField.NAME]: 'New name',
          sourceEditSuggestionId: suggestionId,
        }),
      }),
    );
    expect(result).toMatchObject({
      success: true,
      result: { action: 'PENDING_RE_APPROVAL' },
    });
  });

  it('blocks a second sensitive apply while re-approval is pending', async () => {
    const suggestion = doc({
      _id: suggestionId,
      locationId,
      userId,
      fieldName: EditSuggestionField.ADDRESS,
      oldValue: 'Old address',
      newValue: { value: 'New address' },
      routingTarget: RoutingTarget.VENDOR,
      status: EditSuggestionStatus.PENDING,
    });
    const { service, locationRequestModel } = createService({
      suggestion,
      pendingUpdate: { _id: new Types.ObjectId() },
    });

    await expect(
      service.apply(String(ownerId), String(suggestionId)),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(locationRequestModel.create).not.toHaveBeenCalled();
  });

  it('pushes duplicate flags to duplicate review', async () => {
    const suggestion = doc({
      _id: suggestionId,
      locationId,
      userId,
      fieldName: EditSuggestionField.FLAG,
      oldValue: null,
      newValue: { value: EditSuggestionFlag.DUPLICATE },
      routingTarget: RoutingTarget.VENDOR,
      status: EditSuggestionStatus.PENDING,
    });
    const { service, location } = createService({ suggestion });

    const result = await service.apply(String(ownerId), String(suggestionId));

    expect(location.isSuspectedDuplicate).toBe(true);
    expect(location.save).toHaveBeenCalled();
    expect(result).toMatchObject({
      success: true,
      result: { action: 'PUSHED_TO_DUPLICATE_REVIEW' },
    });
  });

  it('discards without changing location info', async () => {
    const { service, location, suggestion } = createService();

    const result = await service.discard(
      String(ownerId),
      String(suggestionId),
      'Not correct',
    );

    expect(location.openingHours).toBe('08:00-17:00');
    expect(location.save).not.toHaveBeenCalled();
    expect(suggestion.status).toBe(EditSuggestionStatus.DISCARDED);
    expect(result).toMatchObject({ success: true });
  });
});
