const distanceText = (distance: number) => {
  return distance < 1000
    ? `${Math.round(distance)} m`
    : `${(distance / 1000).toFixed(1)} km`;
};

type DmsValue = number | string | Array<number | string>;

type ExifGps = {
  GPSLatitude?: DmsValue | null;
  GPSLatitudeRef?: string;
  GPSLongitude?: DmsValue | null;
  GPSLongitudeRef?: string;
};

const dmsToDecimal = (dms: DmsValue | null | undefined, ref?: string) => {
  if (!dms) return null;

  let decimal: number;

  if (Array.isArray(dms)) {
    const [degree, minute, second] = dms;
    decimal = Number(degree) + Number(minute) / 60 + Number(second) / 3600;
  } else {
    decimal = Number(dms);
  }

  if (Number.isNaN(decimal)) return null;

  if (ref === "S" || ref === "W") {
    decimal = -decimal;
  }

  return decimal;
};

const getGpsFromExif = (exif: ExifGps | null | undefined) => {
  if (!exif) return null;

  const latitude = dmsToDecimal(exif.GPSLatitude, exif.GPSLatitudeRef);
  const longitude = dmsToDecimal(exif.GPSLongitude, exif.GPSLongitudeRef);

  if (latitude == null || longitude == null) return null;

  return {
    latitude,
    longitude,
  };
};

type ValidationResult = {
  isValid: boolean;
  message?: string;
};

type TimeValue = {
  hours: number;
  minutes: number;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type TextValidationOptions = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  fieldName?: string;
};

type OpeningHoursValidationOptions = {
  required?: boolean;
  allowOvernight?: boolean;
  allowSameTime?: boolean;
};

type PasswordValidationOptions = {
  minLength?: number;
  maxLength?: number;
  requireLetter?: boolean;
  requireNumber?: boolean;
};

type FileValidationOptions = {
  required?: boolean;
  minCount?: number;
  maxCount?: number;
  maxSizeMb?: number;
  allowedMimeTypes?: string[];
};

type FileLike = {
  uri?: string;
  fileName?: string;
  name?: string;
  mimeType?: string;
  type?: string;
  fileSize?: number;
  size?: number;
};

const valid = (): ValidationResult => ({ isValid: true });

const invalid = (message: string): ValidationResult => ({
  isValid: false,
  message,
});

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

const hasBlockedTextCharacters = (value: string) =>
  /[<>{}[\]\\|`^]/.test(value);

const validateRequiredText = (
  value: unknown,
  options: TextValidationOptions = {},
) => {
  const {
    required = true,
    minLength = 1,
    maxLength = 255,
    fieldName = "Truong nay",
  } = options;
  const text = normalizeText(value);

  if (!text) {
    return required ? invalid(`${fieldName} khong duoc de trong.`) : valid();
  }

  if (text.length < minLength) {
    return invalid(`${fieldName} phai co it nhat ${minLength} ky tu.`);
  }

  if (text.length > maxLength) {
    return invalid(`${fieldName} khong duoc vuot qua ${maxLength} ky tu.`);
  }

  if (hasBlockedTextCharacters(text)) {
    return invalid(`${fieldName} chua ky tu khong hop le.`);
  }

  return valid();
};

const validateUserName = (value: unknown) => {
  const result = validateRequiredText(value, {
    fieldName: "Ten",
    minLength: 2,
    maxLength: 80,
  });

  if (!result.isValid) return result;

  if (/\d/.test(normalizeText(value))) {
    return invalid("Ten khong nen chua chu so.");
  }

  return valid();
};

const validatePlaceName = (value: unknown) =>
  validateRequiredText(value, {
    fieldName: "Ten dia diem",
    minLength: 3,
    maxLength: 100,
  });

const validateDescription = (
  value: unknown,
  options: TextValidationOptions = {},
) =>
  validateRequiredText(value, {
    fieldName: "Mo ta",
    minLength: 3,
    maxLength: 1000,
    ...options,
  });

const validateAddress = (
  value: unknown,
  options: TextValidationOptions = {},
) =>
  validateRequiredText(value, {
    fieldName: "Dia chi",
    minLength: 5,
    maxLength: 255,
    ...options,
  });

const validateEmail = (value: unknown) => {
  const email = normalizeText(value).toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  if (!email) {
    return invalid("Email khong duoc de trong.");
  }

  if (email.length > 254 || !emailPattern.test(email)) {
    return invalid("Email khong hop le.");
  }

  return valid();
};

const validatePassword = (
  value: unknown,
  options: PasswordValidationOptions = {},
) => {
  const {
    minLength = 8,
    maxLength = 128,
    requireLetter = false,
    requireNumber = false,
  } = options;
  const password = typeof value === "string" ? value : "";

  if (!password) {
    return invalid("Mat khau khong duoc de trong.");
  }

  if (password.length < minLength) {
    return invalid(`Mat khau phai co it nhat ${minLength} ky tu.`);
  }

  if (password.length > maxLength) {
    return invalid(`Mat khau khong duoc vuot qua ${maxLength} ky tu.`);
  }

  if (requireLetter && !/[A-Za-z]/.test(password)) {
    return invalid("Mat khau phai co it nhat 1 chu cai.");
  }

  if (requireNumber && !/\d/.test(password)) {
    return invalid("Mat khau phai co it nhat 1 chu so.");
  }

  return valid();
};

const validateConfirmPassword = (
  password: unknown,
  confirmPassword: unknown,
) => {
  const passwordValue = typeof password === "string" ? password : "";
  const confirmPasswordValue =
    typeof confirmPassword === "string" ? confirmPassword : "";

  if (!confirmPasswordValue) {
    return invalid("Vui long nhap lai mat khau.");
  }

  if (passwordValue !== confirmPasswordValue) {
    return invalid("Mat khau xac nhan khong khop.");
  }

  return valid();
};

const normalizePhoneNumber = (value: unknown) => {
  let phone = typeof value === "string" ? value.trim() : "";
  phone = phone.replace(/[\s.-]/g, "");

  if (phone.startsWith("+84")) {
    phone = `0${phone.slice(3)}`;
  } else if (phone.startsWith("84")) {
    phone = `0${phone.slice(2)}`;
  }

  return phone;
};

const validatePhoneNumber = (value: unknown) => {
  const phone = normalizePhoneNumber(value);
  const vietnamMobilePattern = /^0(3|5|7|8|9)\d{8}$/;

  if (!phone) {
    return invalid("So dien thoai khong duoc de trong.");
  }

  if (!vietnamMobilePattern.test(phone)) {
    return invalid("So dien thoai khong hop le.");
  }

  return valid();
};

const validateOtp = (value: unknown, length = 6) => {
  const otp = normalizeText(value);
  const otpPattern = new RegExp(`^\\d{${length}}$`);

  if (!otp) {
    return invalid("Ma OTP khong duoc de trong.");
  }

  if (!otpPattern.test(otp)) {
    return invalid(`Ma OTP phai gom ${length} chu so.`);
  }

  return valid();
};

const validateTimeValue = (value: TimeValue | null | undefined) => {
  if (!value) {
    return invalid("Thoi gian khong duoc de trong.");
  }

  const { hours, minutes } = value;

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return invalid("Thoi gian khong hop le.");
  }

  return valid();
};

const validateClockTime = (value: unknown) => {
  const time = normalizeText(value);
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

  if (!time) {
    return invalid("Gio khong duoc de trong.");
  }

  if (!timePattern.test(time)) {
    return invalid("Gio phai co dinh dang HH:mm.");
  }

  return valid();
};

const timeToMinutes = (value: TimeValue | string) => {
  if (typeof value === "string") {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  }

  return value.hours * 60 + value.minutes;
};

const validateTimeRange = (
  start: TimeValue | string,
  end: TimeValue | string,
  options: OpeningHoursValidationOptions = {},
) => {
  const { allowOvernight = false, allowSameTime = false } = options;
  const startResult =
    typeof start === "string" ? validateClockTime(start) : validateTimeValue(start);
  const endResult =
    typeof end === "string" ? validateClockTime(end) : validateTimeValue(end);

  if (!startResult.isValid) return startResult;
  if (!endResult.isValid) return endResult;

  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  if (startMinutes === endMinutes && !allowSameTime) {
    return invalid("Gio dong cua phai khac gio mo cua.");
  }

  if (endMinutes < startMinutes && !allowOvernight) {
    return invalid("Gio dong cua phai sau gio mo cua.");
  }

  return valid();
};

const validateOpeningHours = (
  value: unknown,
  options: OpeningHoursValidationOptions = {},
) => {
  const { required = false } = options;
  const openingHours = normalizeText(value);

  if (!openingHours) {
    return required ? invalid("Gio mo cua khong duoc de trong.") : valid();
  }

  const parts = openingHours.split(/\s*-\s*/);

  if (parts.length !== 2) {
    return invalid("Gio mo cua phai co dinh dang HH:mm-HH:mm.");
  }

  return validateTimeRange(parts[0], parts[1], options);
};

const validateCategoryId = (value: unknown) => {
  if (!normalizeText(value)) {
    return invalid("Vui long chon danh muc.");
  }

  return valid();
};

const validateSubCategoryIds = (
  value: unknown,
  options: { required?: boolean; maxCount?: number } = {},
) => {
  const { required = false, maxCount = 10 } = options;

  if (!Array.isArray(value) || value.length === 0) {
    return required ? invalid("Vui long chon danh muc con.") : valid();
  }

  if (value.some((item) => !normalizeText(item))) {
    return invalid("Danh muc con khong hop le.");
  }

  if (value.length > maxCount) {
    return invalid(`Chi duoc chon toi da ${maxCount} danh muc con.`);
  }

  return valid();
};

const validateLatitude = (value: unknown) => {
  const latitude = Number(value);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return invalid("Vi do khong hop le.");
  }

  return valid();
};

const validateLongitude = (value: unknown) => {
  const longitude = Number(value);

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return invalid("Kinh do khong hop le.");
  }

  return valid();
};

const validateCoordinates = (value: Coordinates | null | undefined) => {
  if (!value) {
    return invalid("Vi tri khong duoc de trong.");
  }

  const latitudeResult = validateLatitude(value.latitude);
  if (!latitudeResult.isValid) return latitudeResult;

  const longitudeResult = validateLongitude(value.longitude);
  if (!longitudeResult.isValid) return longitudeResult;

  return valid();
};

const validateFileCount = (
  files: unknown,
  options: FileValidationOptions = {},
) => {
  const { required = false, minCount = required ? 1 : 0, maxCount = 5 } = options;
  const fileCount = Array.isArray(files) ? files.length : 0;

  if (fileCount < minCount) {
    return invalid(`Vui long them it nhat ${minCount} tep.`);
  }

  if (fileCount > maxCount) {
    return invalid(`Chi duoc them toi da ${maxCount} tep.`);
  }

  return valid();
};

const validateMediaFiles = (
  files: unknown,
  options: FileValidationOptions = {},
) => {
  const countResult = validateFileCount(files, options);
  if (!countResult.isValid) return countResult;
  if (!Array.isArray(files)) return valid();

  const { maxSizeMb = 10, allowedMimeTypes } = options;
  const maxSizeBytes = maxSizeMb * 1024 * 1024;

  for (const file of files as FileLike[]) {
    const fileName = normalizeText(file.fileName ?? file.name);
    const mimeType = normalizeText(file.mimeType ?? file.type);
    const fileSize = Number(file.fileSize ?? file.size ?? 0);

    if (!normalizeText(file.uri) || !fileName) {
      return invalid("Tep tai len khong hop le.");
    }

    if (allowedMimeTypes?.length && !allowedMimeTypes.includes(mimeType)) {
      return invalid("Dinh dang tep khong duoc ho tro.");
    }

    if (fileSize > maxSizeBytes) {
      return invalid(`Moi tep khong duoc vuot qua ${maxSizeMb} MB.`);
    }
  }

  return valid();
};

export {
  distanceText,
  getGpsFromExif,
  dmsToDecimal,
  normalizePhoneNumber,
  validateAddress,
  validateCategoryId,
  validateClockTime,
  validateConfirmPassword,
  validateCoordinates,
  validateDescription,
  validateEmail,
  validateFileCount,
  validateLatitude,
  validateLongitude,
  validateMediaFiles,
  validateOpeningHours,
  validateOtp,
  validatePassword,
  validatePhoneNumber,
  validatePlaceName,
  validateRequiredText,
  validateSubCategoryIds,
  validateTimeRange,
  validateTimeValue,
  validateUserName,
};

export type {
  Coordinates,
  FileLike,
  FileValidationOptions,
  OpeningHoursValidationOptions,
  PasswordValidationOptions,
  TextValidationOptions,
  TimeValue,
  ValidationResult,
};
