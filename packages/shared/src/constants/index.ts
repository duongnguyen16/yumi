export const APP_NAME = 'WDP301';

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ReportReason = {
  INCORRECT_INFORMATION: 'INCORRECT_INFORMATION',
  SPAM: 'SPAM',
  PERMANENTLY_CLOSED: 'PERMANENTLY_CLOSED',
  WRONG_OWNER: 'WRONG_OWNER',
  OTHER: 'OTHER',
} as const;

export type ReportReason = (typeof ReportReason)[keyof typeof ReportReason];

export const ReportTargetType = {
  LOCATION: 'LOCATION',
  REVIEW: 'REVIEW',
  USER: 'USER',
  OWNERSHIP: 'OWNERSHIP',
} as const;

export type ReportTargetType =
  (typeof ReportTargetType)[keyof typeof ReportTargetType];

export const ReportStatus = {
  PENDING: 'PENDING',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  APPEALED: 'APPEALED',
  RESOLVED: 'RESOLVED',
} as const;

export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export const ReportRoute = {
  STANDARD_REVIEW: 'STANDARD_REVIEW',
  OWNERSHIP_REVIEW: 'OWNERSHIP_REVIEW',
} as const;

export type ReportRoute = (typeof ReportRoute)[keyof typeof ReportRoute];
