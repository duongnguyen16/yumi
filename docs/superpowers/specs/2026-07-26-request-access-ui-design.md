# Request Access UI Design

## Scope

Improve the Expo request-access creation screen for an already-owned location. Preserve the existing ownership workflow and API state machine.

## Interface

Remove the single `Yêu cầu quyền quản lý` form header and organize the form into three sections:

1. `Lý do yêu cầu`
   - Keep the existing optional reason field.
2. `Bằng chứng xác thực`
   - Keep the existing requirement of one to five on-site photos with device location.
3. `Kiểm tra số điện thoại`
   - When OTP is required, show the complete public contact phone number returned by the API.
   - Explain that this is the public contact number of the named location.
   - Show the six-digit OTP input without a separate verification button.
   - When the location has no contact phone, explain that OTP is not required.

The bottom action bar contains one action:

- `Xác minh và gửi yêu cầu` when OTP is required.
- `Gửi yêu cầu` when OTP is not required.

The action remains disabled until a verification session exists, at least one proof photo exists, and a six-digit OTP is present when required.

## Data Flow

`POST /request-access/verification/start` continues to send the OTP to `location.phone` and additionally returns:

- `destinationPhone`: the complete public location contact number when OTP is required.
- `destinationType`: `LOCATION_CONTACT`.

On the single mobile action:

1. If OTP is required and has not been verified, call the existing OTP verification endpoint.
2. Stop and display the verification error when OTP verification fails.
3. Upload the selected proof images.
4. Submit the request-access payload with the verified session ID.
5. Return to the previous screen only after request creation succeeds.

If OTP is not required, skip step 1 and submit normally.

## Error and Retry Behavior

- OTP errors remain visible on the same screen and do not upload evidence.
- Upload or request-creation failures leave the verified session available for retry until it expires or is consumed.
- Loading disables the combined action to prevent duplicate requests.
- Existing API validation remains authoritative for Vendor eligibility, evidence, ownership state, and verification-session consumption.

## Verification

- API unit test verifies that the start response exposes the full location contact phone and its source.
- Mobile service test verifies the extended response contract.
- Mobile state tests verify the combined action label and disabled state for OTP and non-OTP cases.
- Focused API and mobile test suites, lint/type checks for touched files, and `git diff --check` must pass.
