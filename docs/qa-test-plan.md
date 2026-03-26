# QA Test Plan - Tro FullStack

## 1. Scope

System under test:
- FE: Next.js admin/member dashboard, auth pages, shared shell, API client.
- BE: NestJS REST API for auth, houses, rooms, members, expenses, bills, payments, settlements, notifications, uploads, dashboard.

Primary business flows:
- Register / login / logout / session restore.
- Create house, room, member, assign room, deactivate member.
- Create expense, split shares, generate monthly settlement.
- View bills, create payment proof, generate QR, confirm payment.
- View and mark notifications as read.
- Upload receipt image.

## 2. Priority Rules

- P0: auth, expense allocation, settlement generation, payment confirmation, data integrity.
- P1: member/room management, bills view, uploads, dashboard summary.
- P2: UI polish, empty states, labels, formatting.

## 3. Test Scenarios and High-Value Test Cases

| ID | Area | Scenario | Priority | Expected result |
|---|---|---|---|---|
| AUTH-01 | Auth | Register with valid email/password/fullName | P0 | User is created, token returned, session can be stored. |
| AUTH-02 | Auth | Register with duplicate email | P0 | Request is rejected, no duplicate user created. |
| AUTH-03 | Auth | Login with valid credentials for tenant | P0 | Token returned, FE redirects to member dashboard. |
| AUTH-04 | Auth | Login with valid credentials for admin/owner/manager | P0 | Token returned, FE redirects to admin dashboard. |
| AUTH-05 | Auth | Login with invalid password | P0 | 401/unauthorized, no session saved. |
| AUTH-06 | Auth | Refresh/reopen browser with saved session | P1 | FE restores session and keeps correct role redirect. |
| HOUSE-01 | Houses | Create house with valid code/name/address | P0 | House created, visible in downstream room/member flows. |
| HOUSE-02 | Houses | Create house with invalid paymentDueDay (<1, >28, non-int) | P1 | Validation fails. |
| ROOM-01 | Rooms | Create room with valid houseId/code/capacity | P0 | Room created and listed under house. |
| ROOM-02 | Rooms | Create room with invalid capacity (0, negative, string) | P0 | Validation fails. |
| ROOM-03 | Rooms | List rooms by house | P1 | Only rooms of target house are returned. |
| MEMBER-01 | Members | Create member with new email and optional room | P0 | User and membership created, role defaults to TENANT. |
| MEMBER-02 | Members | Create member with existing user email in same house | P0 | Existing user is reused, membership upserted, no duplicate user. |
| MEMBER-03 | Members | Assign room to active membership | P1 | Membership roomId updated and reflected in list. |
| MEMBER-04 | Members | Remove membership | P1 | Membership becomes inactive, leftAt set, room cleared. |
| EXP-01 | Expenses | Create expense with participantMembershipIds | P0 | Expense + allocations created, split sums equal total amount. |
| EXP-02 | Expenses | Create expense using participantUserIds and/or roomId | P0 | Participants resolved correctly, no empty allocation set. |
| EXP-03 | Expenses | Create expense with no valid participants | P0 | Request rejected with clear error. |
| EXP-04 | Expenses | List expenses by house and month | P1 | Filter works, latest first. |
| SETTLE-01 | Settlements | Generate settlement for month/year | P0 | Settlement items reflect allocations and payments by member. |
| SETTLE-02 | Settlements | Re-generate same settlement month | P0 | Existing settlement is updated, items refreshed, no duplication. |
| BILL-01 | Bills | List bills for member by userId | P0 | Bills map to member settlement items and status is correct. |
| BILL-02 | Bills | Open bill detail | P0 | Detail includes line items, payments, member/room metadata. |
| BILL-03 | Bills | Request bill list without userId | P0 | Clear validation error. |
| PAY-01 | Payments | Create manual payment proof for a settlement line | P0 | Payment record created with PENDING status. |
| PAY-02 | Payments | Generate QR for existing settlement line | P1 | QR content and payable amount are returned. |
| PAY-03 | Payments | Confirm payment | P0 | Payment becomes SUCCEEDED, settlement item paidAmount updates, settlement totalPaid updates. |
| PAY-04 | Payments | Confirm non-existent payment | P0 | 404 not found. |
| NOTIF-01 | Notifications | List notifications for user | P1 | Returns only the target user notifications in descending time order. |
| NOTIF-02 | Notifications | Mark notification as read | P1 | Recipient status changes to read/sent and UI updates. |
| UPLOAD-01 | Uploads | Upload valid image under 5MB | P1 | File stored and public URL returned. |
| UPLOAD-02 | Uploads | Upload non-image file | P0 | Rejected with clear error. |
| UPLOAD-03 | Uploads | Upload image over 5MB | P0 | Rejected by file size limit. |
| DASH-01 | Dashboard | Admin summary for house/month | P1 | Rooms, total expense, overdue count, latest settlement returned. |
| DASH-02 | Dashboard | Member summary for user/month | P1 | Current due and notifications match bill data. |

## 4. Regression Suite

Run after any change to auth, settlement, payments, or expense allocation:
- Login/register still returns role expected by FE routing.
- Admin/member dashboards still render after session restore.
- Expense split totals still equal the original total amount.
- Settlement generation still produces the same item count as active memberships.
- Bill status still matches paid/balance/due date rules.
- Payment confirmation still updates item, payment, and settlement totals consistently.
- Upload API still accepts `multipart/form-data` and returns a public URL.

## 5. Edge Cases To Exercise

- Total amount with decimals, especially values that create rounding remainders.
- One participant, many participants, and uneven split methods.
- Empty or partially invalid participant ids.
- Member removed before settlement generation.
- Member without room assigned.
- Multiple payments against the same settlement item.
- Month boundary cases: January, December, leap year dates.
- Upload filenames with spaces, uppercase extensions, duplicate names.
- Unauthorized calls to protected endpoints.
- Empty query params for list endpoints.

## 6. Risks and Suspected Defects From Code Review

| Severity | Risk | Why it matters |
|---|---|---|
| High | Bill due date calculation uses JS month index incorrectly in `BillsService` (`new Date(year, month, 10)`) | A settlement month like `2026-03` will map to April 10, not March 10. Bill status can become wrong. |
| High | Expense creation can proceed with empty allocations when `participantMembershipIds` are provided but none resolve | Creates an expense with no shares, breaking settlement/bill logic. |
| High | `/auth/me` falls back to a demo user when no current user exists | Can hide auth bugs and return misleading identity data. |
| High | Payment confirmation has no idempotency guard | Duplicate confirm requests can overstate paid totals or create inconsistent state. |
| Medium | Upload URL is hardcoded to `http://localhost` plus `APP_PORT` | Production/staging URLs will be wrong unless proxying rewrites them. |
| Medium | FE maps backend roles `OWNER` and `MANAGER` both to `admin` | Role-specific UI or authorization distinctions are lost. |
| Medium | `notifications.markRead` stores status as `SENT` | Semantics are confusing and can make reporting harder to reason about. |

## 7. Suggested Execution Order

1. Auth + session.
2. House/room/member setup.
3. Expense creation and split validation.
4. Settlement generation.
5. Bills and payment confirmation.
6. Notifications and uploads.
7. Dashboard summaries.

