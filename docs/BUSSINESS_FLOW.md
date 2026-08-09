# Module Authentication

### POST /auth/register

1. Validate request body { email, password, name}

```json
{
  "email": "john@example.com",
  "password": "12345678",
  "name": "John"
}
```

2. Normalize email
   - If email existing -> 409 EMAIL_ALREADY_EXISTS
3. Hash password
4. Create user with
   - `email`
   - `password_hash`
   - `name`
   - `preferred_language` (optional)
5. Response `201 Created` with public user data

```json
{
  "email": "john@example.com",
  "password": "12345678",
  "name": "John"
}
```

### POST /auth/login

1. Validate request body { email, password }

```json
{
  "email": "john@example.com",
  "password": "12345678"
}
```

2. Normalize email (`trim` and `lowercase`)
3. Find user by email
   - If not found, return -> 401 INVALID_CREDENTIAL
4. Compare `password` and `password_hash`
   - If invalid, return -> 401 INVALID_CREDENTIAL
5. Get session metadata from the request:
   - `device_name` (derive from `User-Agent`, or accept a client-provided name)
   - `user_agent` (from `User-Agent` header)
   - `ip_address` (from request IP; account for trusted proxy configuration)
6. Generate random secure session token
7. Hash session token
8. Create session with
   - `user_id`
   - `token_hash`
   - `device_name` (optional)
   - `user_agent` (optional)
   - `ip_address` (optional)
9. Response `200 OK`

```json
{
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "name": "John"
    },
    "sessionToken": "random_token",
    "expiresAt": "2026-09-01T12:00:00Z"
  }
}
```

### POST /auth/logout

1. Extract session token from the `Authorization: Bearer <token>` header
2. If the token is missing or malformed, return `401 UNAUTHORIZED`
3. Hash the session token
4. Find an active session by `token_hash` in Database
   - Session must not be revoked (`revoked_at IS NULL`)
   - Session must not be expired (`expires_at > now()`)
5. If no active session is found, return `401 UNAUTHORIZED`
6. Revoked the session by setting `revoked_at = now()` and Update into the database
7. Response `200 OK`

```json
{
  "message": "Logout successful"
}
```

### GET /auth/me

1. Extract session token from the `Authorization: Bearer <token>` header
2. If the token is missing or malformed, return `401 UNAUTHORIZED`
3. Hash the session token
4. Find an active session and associated user by joining `sessions.user_id` in Database.
   - `token_hash` matched the hashed token
   - Session must not be revoked (`revoked_at IS NULL`)
   - Session must not be expired (`expires_at > now()`)
5. If no active session and user are found, return `401 UNAUTHORIZED`
6. Return `200 OK` with public user data

```json
{
  "message": "Current user retrieved successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "name": "John",
      "preferredLanguage": "TH",
      "createdAt": "2026-08-07T12:00:00Z"
    }
  }
}
```

# Module Account

### POST /accounts

1. Extract session token from the `Authorization: Bearer <token>` header
2. If the token is missing or malformed, return `401 UNAUTHORIZED`
3. Hash the session token
4. Find an active session and associated user by joining `sessions.user_id` in Database.
   - `token_hash` matched the hashed token
   - Session must not be revoked (`revoked_at IS NULL`)
   - Session must not be expired (`expires_at > now()`)
5. If no active session and user are found, return `401 UNAUTHORIZED`
6. Validate request body

```json
{
  "name": "SCB",
  "type": "BANK",
  "currency": "THB",
  "openingBalance": 10000
}
```

5. BEGIN TRANSACTION
   - Create account with
     - `user_id`
     - `name`
     - `type`
     - `currency`
   - Create a first transaction with
     - `user_id`
     - `account_id`
     - `type`: OPENING_BALANCE
     - `amount`: body.openingBalance
   - COMMIT

6. Return `201 CREATED`

```json
{
  "message": "Account created successfully",
  "data": {
    "id": "uuid",
    "name": "SCB",
    "type": "BANK",
    "currency": "THB"
  }
}
```

### GET /accounts

1. Extract session token from the `Authorization: Bearer <token>` header
2. If the token is missing or malformed, return `401 UNAUTHORIZED`
3. Hash the session token
4. Find an active session and associated user by joining `sessions.user_id` in Database.
   - `token_hash` matched the hashed token
   - Session must not be revoked (`revoked_at IS NULL`)
   - Session must not be expired (`expires_at > now()`)
5. If no active session and user are found, return `401 UNAUTHORIZED`
6. Validate query parameters:
   - `page` must be a positive integer; default to `1`
   - `limit` must be a positive integer; default to `20`
   - `limit` must not exceed `100`
   - If invalid, return `400 INVALID_QUERY_PARAMETERS`
7. Calculate `offset = (page - 1) * limit`
8. Find all active accounts owned by the authenticated user and calculate
   each account balance from its transactions.
   - `accounts.user_id` equals the authenticated `user_id`
   - `account_status = 'ACTIVE'`
   - Add `INCOME` and `OPENING_BALANCE`
   - Subtract `EXPENSE`
   - Apply `LIMIT` and `OFFSET`
9. Count all active accounts owned by the authenticated user as `total`.
10. Calculate `totalPages = ceil(total / limit)`.
11. Return `200 OK` with the accounts, balances, and pagination.

```json
{
  "message": "Accounts retrieved successfully",
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "SCB",
        "type": "BANK",
        "currency": "THB",
        "balance": 9500
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 120,
      "totalPages": 6
    }
  }
}
```

### PATCH /accounts/:id

1. 1. Extract session token from the `Authorization: Bearer <token>` header
2. If the token is missing or malformed, return `401 UNAUTHORIZED`
3. Hash the session token
4. Find an active session and associated user by joining `sessions.user_id` in Database.
   - `token_hash` matched the hashed token
   - Session must not be revoked (`revoked_at IS NULL`)
   - Session must not be expired (`expires_at > now()`)
5. If no active session and user are found, return `401 UNAUTHORIZED`
6. Validate request body.
   - Allow only `name`, `type`, and `account_status`
   - At least one field must be provided
   - Validate `type` and `account_status` against their enums
   - If invalid, return `400 INVALID_REQUEST_BODY`

```json
{
  "name": "SCB Main",
  "type": "BANK",
  "account_status": "ACTIVE"
}
```

7. Find and update the account where:
   - `accounts.id` equals `id`
   - `accounts.user_id` equals the authenticated `user_id`
8. If no account is updated, return `404 ACCOUNT_NOT_FOUND`.
9. Return `200 OK` with the updated account.

```json
{
  "message": "Account updated successfully",
  "data": {
    "id": "uuid",
    "name": "SCB Main",
    "type": "BANK",
    "currency": "THB",
    "accountStatus": "ACTIVE"
  }
}
```

### DELETE /accounts/:id

1. Extract session token from the `Authorization: Bearer <token>` header.
2. If the token is missing or malformed, return `401 UNAUTHORIZED`.
3. Hash the session token.
4. Find an active session and its associated user by joining
   `sessions.user_id` with `users.id`.
   - `token_hash` matches the hashed token
   - `revoked_at IS NULL`
   - `expires_at > now()`
5. If no active session and user are found, return `401 UNAUTHORIZED`.
6. Validate path parameter `id` as a UUID.
   - If invalid, return `400 INVALID_ACCOUNT_ID`.
7. Find the active account where:
   - `accounts.id` equals `id`
   - `accounts.user_id` equals the authenticated `user_id`
   - `account_status = 'ACTIVE'`
8. If no account is found, return `404 ACCOUNT_NOT_FOUND`.
9. Soft-delete the account by updating:
   - `account_status = 'INACTIVE'`
   - `updated_at = now()`
10. Return `200 OK`.

```json
{
  "message": "Accounts deleted successfully"
}
```

# Module Category

### POST /categories

1. Extract session token from the `Authorization: Bearer <token>` header.
2. If the token is missing or malformed, return `401 UNAUTHORIZED`.
3. Hash the session token.
4. Find an active session.
   - `token_hash` matches the hashed token
   - `revoked_at IS NULL`
   - `expires_at > now()`
5. If no active session is found, return `401 UNAUTHORIZED`.
6. Validate request body.
   - Allow only `name` and `type`
   - `name` is required and must not be blank
   - `name` must not exceed 100 characters
   - `type` must be `INCOME` or `EXPENSE`
   - If invalid, return `400 INVALID_REQUEST_BODY`

````json
{
  "name": "Food",
  "type": "EXPENSE"
}
7. Normalize `name` by trimming whitespace.
8. Check whether a category with the same `name` already exists for the
   authenticated user.
   - `categories.user_id` equals authenticated `user_id`
   - `categories.name` equals normalized `name`
9. If a duplicate category exists, return `409 CATEGORY_ALREADY_EXISTS`.
10. Create a category with:
    - `user_id`: authenticated `user_id`
    - `name`: normalized `name`
    - `type`: request `type`
    - `category_status`: `true`
11. Return `201 CREATED`.

### GET /categories

1. Extract session token from the `Authorization: Bearer <token>` header.
2. If the token is missing or malformed, return `401 UNAUTHORIZED`.
3. Hash the session token.
4. Find an active session and its associated user by joining
   `sessions.user_id` with `users.id`.
   - `token_hash` matches the hashed token
   - `revoked_at IS NULL`
   - `expires_at > now()`
5. If no active session and user are found, return `401 UNAUTHORIZED`.
6. Validate query parameters:
   - `page` must be a positive integer; default to `1`
   - `limit` must be a positive integer; default to `20`; maximum `100`
   - `type` is optional; if provided, it must be `INCOME` or `EXPENSE`
   - `includeInactive` is optional; if provided, it must be `true` or `false`
   - If invalid, return `400 INVALID_QUERY_PARAMETERS`
7. Calculate `offset = (page - 1) * limit`.
8. Find categories owned by the authenticated user.
   - `categories.user_id` equals authenticated `user_id`
   - Filter by `type` when provided
   - Return only `is_active = true` by default
   - Include inactive categories when `includeInactive = true`
   - Sort by `type` and `name` in ascending order
   - Apply `LIMIT` and `OFFSET`
9. Count all matching categories as `total`.
10. Calculate `totalPages = ceil(total / limit)`.
11. Return `200 OK`.

```json
{
  "message": "Categories retrieved successfully",
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "Food",
        "type": "EXPENSE",
        "category_status": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "totalPages": 3
    }
  }
}
````

### PATCH /categories/:id

1. Extract session token from the `Authorization: Bearer <token>` header.
2. If the token is missing or malformed, return `401 UNAUTHORIZED`.
3. Hash the session token.
4. Find an active session and its associated user by joining
   `sessions.user_id` with `users.id`.
   - `token_hash` matches the hashed token
   - `revoked_at IS NULL`
   - `expires_at > now()`
5. If no active session and user are found, return `401 UNAUTHORIZED`.
6. Validate path parameter `id` as a UUID.
   - If invalid, return `400 INVALID_CATEGORY_ID`.
7. Validate request body.
   - Allow only `name`, `type`, and `isActive`
   - At least one field must be provided
   - `name` must not be blank
   - `type` must be `INCOME` or `EXPENSE`
   - `category_status` must be true or false
   - If invalid, return `400 INVALID_REQUEST_BODY`
8. Normalize `name` when provided, for example trim whitespace.
9. Check for a category with the same `name` owned by
   the authenticated user, excluding the current category.
10. If a duplicate category exists, return `409 CATEGORY_ALREADY_EXISTS`.
11. Find and update the category where:
    - `categories.id` equals `id`
    - `categories.user_id` equals authenticated `user_id`
12. If no category is updated, return `404 CATEGORY_NOT_FOUND`.
13. Return `200 OK` with the updated category.

```json
{
  "message": "Category updated successfully",
  "data": {
    "id": "uuid",
    "name": "Dining",
    "type": "EXPENSE",
    "categoryStatus": true
  }
}
```

### DELETE /categories/:id

1. Extract session token from the `Authorization: Bearer <token>` header.
2. If the token is missing or malformed, return `401 UNAUTHORIZED`.
3. Hash the session token.
4. Find an active session and its associated user by joining
   `sessions.user_id` with `users.id`.
   - `token_hash` matches the hashed token
   - `revoked_at IS NULL`
   - `expires_at > now()`
5. If no active session and user are found, return `401 UNAUTHORIZED`.
6. Validate path parameter `id` as a UUID.
   - If invalid, return `400 INVALID_CATEGORY_ID`.
7. Find the active category where:
   - `categories.id` equals `id`
   - `categories.user_id` equals authenticated `user_id`
   - `category_status = true`
8. If no category is found, return `404 CATEGORY_NOT_FOUND`.
9. Soft-delete the category by updating:
   - `category_status = false`
   - `updated_at = now()`
10. Return `200 OK`.

```json
{
  "message": "Category deleted successfully"
}
```

# Module Transaction

### POST /transactions

1. Extract session token from the `Authorization: Bearer <token>` header.
2. If the token is missing or malformed, return `401 UNAUTHORIZED`.
3. Hash the session token.
4. Find an active session and its associated user by joining
   `sessions.user_id` with `users.id`.
   - `token_hash` matches the hashed token
   - `revoked_at IS NULL`
   - `expires_at > now()`
5. If no active session and user are found, return `401 UNAUTHORIZED`.
6. Validate request body:
   - `accountId` is required and must be a UUID
   - `categoryId` is optional; if provided, it must be a UUID
   - `type` must be `INCOME` or `EXPENSE`
   - Do not accept `OPENING_BALANCE`; it is created only by `POST /accounts`
   - `amount` is required, positive, and has no more than 2 decimal places
   - `note` is optional
   - `transactionDate` is required and must be a valid date/time
   - If invalid, return `400 INVALID_REQUEST_BODY`

   ```json
   {
     "accountId": "uuid",
     "categoryId": "uuid",
     "type": "EXPENSE",
     "amount": 250,
     "note": "Lunch",
     "transactionDate": "2026-08-07T12:00:00Z"
   }
   ```

7. Find an active account where:
   - `accounts.id` equals `accountId`
   - `accounts.user_id` equals the authenticated `user_id`
   - `account_status = 'ACTIVE'`
8. If no account is found, return `404 ACCOUNT_NOT_FOUND`.
9. If `categoryId` is provided, find an active category where:
   - `categories.id` equals `categoryId`
   - `categories.user_id` equals the authenticated `user_id`
   - `categories.category_status = true`
   - `categories.type` equals request `type`
10. If no valid category is found, return `404 CATEGORY_NOT_FOUND`.
11. Create a transaction with:
    - `user_id`: authenticated `user_id`
    - `account_id`: `accountId`
    - `category_id`: `categoryId` or `null`
    - `type`
    - `amount`
    - `note`
    - `transaction_date`: `transactionDate`
12. Return `201 Created`.

```json
{
  "message": "Transaction created successfully",
  "data": {
    "id": "uuid",
    "accountId": "uuid",
    "categoryId": "uuid",
    "type": "EXPENSE",
    "amount": 120.5,
    "note": "Lunch",
    "transactionDate": "2026-08-07T12:00:00Z"
  }
}
```

### GET /transactions

1. Extract session token from the `Authorization: Bearer <token>` header.
2. If the token is missing or malformed, return `401 UNAUTHORIZED`.
3. Hash the session token.
4. Find an active session and its associated user by joining
   `sessions.user_id` with `users.id`.
   - `token_hash` matches the hashed token
   - `revoked_at IS NULL`
   - `expires_at > now()`
5. If no active session and user are found, return `401 UNAUTHORIZED`.
6. Validate query parameters:
   - `page` must be a positive integer; default to `1`
   - `limit` must be a positive integer; default to `20`; maximum `100`
   - `type` is optional; if provided, it must be `INCOME`, `EXPENSE`, or `OPENING_BALANCE`
   - `accountId` is optional; if provided, it must be a UUID
   - `month` is optional; if provided, it must be an integer from `1` to `12`
   - `year` is optional; if provided, it must be a positive integer
   - `month` and `year` must be provided together
   - `startDate` and `endDate` are optional; if provided, they must be valid date/time values
   - `startDate` must not be after `endDate`
   - Do not allow `month`/`year` together with `startDate`/`endDate`
   - If invalid, return `400 INVALID_QUERY_PARAMETERS`
7. Calculate `offset = (page - 1) * limit`.
8. Find transactions owned by the authenticated user.
   - `transactions.user_id` equals authenticated `user_id`
   - Filter by `type` when provided
   - Filter by `account_id` when `accountId` is provided
   - Filter by the selected `month` and `year` when provided
   - Otherwise, filter from `transaction_date >= startDate` when provided
   - Otherwise, filter until `transaction_date <= endDate` when provided
   - Join `accounts` to return account information
   - Left join `categories` to return category information
   - Sort by `transaction_date DESC`, then `created_at DESC`
   - Apply `LIMIT` and `OFFSET`
9. Count all matching transactions as `total`.
10. Calculate `totalPages = ceil(total / limit)`.
11. Return `200 OK` with transactions and pagination.

```json
{
  "message": "Transactions retrieved successfully",
  "data": {
    "items": [
      {
        "id": "uuid",
        "account": {
          "id": "uuid",
          "name": "SCB"
        },
        "category": {
          "id": "uuid",
          "name": "Food"
        },
        "type": "EXPENSE",
        "amount": 250,
        "note": "Lunch",
        "transactionDate": "2026-08-07T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 120,
      "totalPages": 6
    }
  }
}
```

### PATCH /transactions/:id

1. Extract session token from the `Authorization: Bearer <token>` header.
2. If the token is missing or malformed, return `401 UNAUTHORIZED`.
3. Hash the session token.
4. Find an active session and its associated user by joining
   `sessions.user_id` with `users.id`.
   - `token_hash` matches the hashed token
   - `revoked_at IS NULL`
   - `expires_at > now()`
5. If no active session and user are found, return `401 UNAUTHORIZED`.
6. Validate path parameter `id` as a UUID.
   - If invalid, return `400 INVALID_TRANSACTION_ID`.
7. Find the transaction where:
   - `transactions.id` equals `id`
   - `transactions.user_id` equals authenticated `user_id`
8. If no transaction is found, return `404 TRANSACTION_NOT_FOUND`.
9. If the transaction type is `OPENING_BALANCE`, return
   `409 OPENING_BALANCE_NOT_EDITABLE`.
10. Validate request body.
    - Allow only `accountId`, `categoryId`, `type`, `amount`, `note`, and `transactionDate`
    - At least one field must be provided
    - `accountId`, if provided, must be a UUID
    - `categoryId`, if provided, must be a UUID or `null`
    - `type`, if provided, must be `INCOME` or `EXPENSE`
    - `amount`, if provided, must be positive and have no more than 2 decimal places
    - `note`, if provided, must be a string or `null`
    - `transactionDate`, if provided, must be a valid date/time
    - If invalid, return `400 INVALID_REQUEST_BODY`
11. If `accountId` is provided, find an active account where:
    - `accounts.id` equals `accountId`
    - `accounts.user_id` equals authenticated `user_id`
    - `account_status = 'ACTIVE'`
12. If no account is found, return `404 ACCOUNT_NOT_FOUND`.
13. If `categoryId` is provided, find an active category where:
    - `categories.id` equals `categoryId`
    - `categories.user_id` equals authenticated `user_id`
    - `categories.is_active = true`
    - `categories.type` equals the final transaction type
      (the request `type`, or the existing type if omitted)
14. If no valid category is found, return `404 CATEGORY_NOT_FOUND`.
15. Update the transaction with the provided fields only.
16. Return `200 OK` with the updated transaction.

# Module Image

### POST /transactions/:id/images

1. Extract session token from the `Authorization: Bearer <token>` header.
2. If the token is missing or malformed, return `401 UNAUTHORIZED`.
3. Hash the session token.
4. Find an active session and its associated user by joining
   `sessions.user_id` with `users.id`.
   - `token_hash` matches the hashed token
   - `revoked_at IS NULL`
   - `expires_at > now()`
5. If no active session and user are found, return `401 UNAUTHORIZED`.
6. Validate path parameter `id` as a UUID.
   - If invalid, return `400 INVALID_TRANSACTION_ID`.
7. Find the transaction where:
   - `transactions.id` equals `id`
   - `transactions.user_id` equals authenticated `user_id`
8. If no transaction is found, return `404 TRANSACTION_NOT_FOUND`.
9. Validate the multipart file upload:
   - Require one `file`
   - Allow only supported image MIME types, for example `image/jpeg`, `image/png`, and `image/webp`
   - Verify the actual file signature, not only the client-provided MIME type
   - Enforce a maximum file size, for example `5 MB`
   - Do not trust the original file name as a storage path
   - If invalid, return `400 INVALID_IMAGE_FILE`
10. Generate a server-side unique `file_key`.
11. Upload the image to object storage using `file_key`.
    - If upload fails, return `500 IMAGE_UPLOAD_FAILED`.
12. Create an image record in the database:
    - `transaction_id`: transaction `id`
    - `file_key`
    - `file_name`: sanitized original file name
    - `mime_type`
    - `file_size`
13. If creating the database record fails:
    - Delete the uploaded object from storage as a compensating action
    - Return `500 IMAGE_CREATION_FAILED`
14. Return `201 Created` with image metadata.

# Module Budget

### POST /budgets

1. Extract session token from the `Authorization: Bearer <token>` header.
2. If the token is missing or malformed, return `401 UNAUTHORIZED`.
3. Hash the session token.
4. Find an active session and its associated user by joining `sessions.user_id` with `users.id`.
   - `token_hash` matches the hashed token
   - `revoked_at IS NULL`
   - `expires_at > now()`
5. If no active session and user are found, return `401 UNAUTHORIZED`.
6. Validate request body:
   - `categoryId` is required and must be a UUID
   - `amount` is required, positive, and has no more than 2 decimal places
   - `month` is required and must be an integer from `1` to `12`
   - `year` is required and must be a positive integer
   - If invalid, return `400 INVALID_REQUEST_BODY`
7. Find an active expense category where:
   - `categories.id` equals `categoryId`
   - `categories.user_id` equals authenticated `user_id`
   - `categories.is_active = true`
   - `categories.type = 'EXPENSE'`
8. If no category is found, return `404 EXPENSE_CATEGORY_NOT_FOUND`.
9. Check whether a budget already exists with the same `user_id`, `category_id`, `month`, and `year`.
10. If a budget already exists, return `409 BUDGET_ALREADY_EXISTS`.
11. Create a budget with `user_id`, `category_id`, `amount`, `month`, and `year`.
12. Return `201 Created`.

```json
{
  "message": "Budget created successfully",
  "data": {
    "id": "uuid",
    "categoryId": "uuid",
    "amount": 5000,
    "month": 8,
    "year": 2026
  }
}
```

### GET /budgets

1. Extract session token from the `Authorization: Bearer <token>` header.
2. If the token is missing or malformed, return `401 UNAUTHORIZED`.
3. Hash the session token.
4. Find an active session and its associated user by joining `sessions.user_id` with `users.id`.
   - `token_hash` matches the hashed token
   - `revoked_at IS NULL`
   - `expires_at > now()`
5. If no active session and user are found, return `401 UNAUTHORIZED`.
6. Validate query parameters:
   - `page` must be a positive integer; default to `1`
   - `limit` must be a positive integer; default to `20`; maximum `100`
   - `month` is optional; if provided, it must be an integer from `1` to `12`
   - `year` is optional; if provided, it must be a positive integer
   - `month` and `year` must be provided together
   - If both are omitted, default to the current month and year
   - If invalid, return `400 INVALID_QUERY_PARAMETERS`
7. Calculate `offset = (page - 1) * limit`.
8. Find budgets owned by the authenticated user for the selected `month` and `year`.
   - `budgets.user_id` equals authenticated `user_id`
   - `budgets.month` equals selected `month`
   - `budgets.year` equals selected `year`
   - Join `categories` to return category information
9. Calculate `spentAmount` for each budget.
   - Sum `transactions.amount`
   - `transactions.user_id` equals authenticated `user_id`
   - `transactions.category_id` equals the budget `category_id`
   - `transactions.type = 'EXPENSE'`
   - `transaction_date` is within the selected month and year
   - Return `0` when no matching transactions exist
10. Calculate `remainingAmount = budget.amount - spentAmount`.
11. Sort by category name in ascending order.
12. Apply `LIMIT` and `OFFSET`.
13. Count all matching budgets as `total`.
14. Calculate `totalPages = ceil(total / limit)`.
15. Return `200 OK` with budgets and pagination.

```json
{
  "message": "Budgets retrieved successfully",
  "data": {
    "items": [
      {
        "id": "uuid",
        "category": {
          "id": "uuid",
          "name": "Food"
        },
        "amount": 5000,
        "spentAmount": 1250,
        "remainingAmount": 3750,
        "month": 8,
        "year": 2026
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

# Session

### GET /sessions

1. Extract session token from the `Authorization: Bearer <token>` header.
2. If the token is missing or malformed, return `401 UNAUTHORIZED`.
3. Hash the session token.
4. Find an active session and its associated user by joining `sessions.user_id` with `users.id`.
   - `token_hash` matches the hashed token
   - `revoked_at IS NULL`
   - `expires_at > now()`
5. If no active session and user are found, return `401 UNAUTHORIZED`.
6. Validate query parameters:
   - `page` must be a positive integer; default to `1`
   - `limit` must be a positive integer; default to `20`; maximum `100`
   - `includeRevoked` is optional; if provided, it must be `true` or `false`; default to `false`
   - If invalid, return `400 INVALID_QUERY_PARAMETERS`
7. Calculate `offset = (page - 1) * limit`.
8. Find sessions owned by the authenticated user.
   - `sessions.user_id` equals authenticated `user_id`
   - Exclude expired sessions: `expires_at > now()`
   - Exclude revoked sessions by default: `revoked_at IS NULL`
   - Include revoked sessions when `includeRevoked = true`
   - Sort by `created_at DESC`
   - Apply `LIMIT` and `OFFSET`
9. Mark the current session by comparing each session `token_hash` with the hashed token from step 3.
10. Count all matching sessions as `total`.
11. Calculate `totalPages = ceil(total / limit)`.
12. Return `200 OK` with sessions and pagination.

# Report

### GET /reports/summary

1. Extract session token from the `Authorization: Bearer <token>` header.
2. If the token is missing or malformed, return `401 UNAUTHORIZED`.
3. Hash the session token.
4. Find an active session and its associated user by joining `sessions.user_id` with `users.id`.
   - `token_hash` matches the hashed token
   - `revoked_at IS NULL`
   - `expires_at > now()`
5. If no active session and user are found, return `401 UNAUTHORIZED`.
6. Validate query parameters:
   - `month` is optional; if provided, it must be an integer from `1` to `12`
   - `year` is optional; if provided, it must be a positive integer
   - `month` and `year` must be provided together
   - `startDate` and `endDate` are optional; if provided, they must be valid date/time values
   - `startDate` must not be after `endDate`
   - Do not allow `month`/`year` together with `startDate`/`endDate`
   - If no date filter is provided, default to the current month and year
   - `accountId` is optional; if provided, it must be a UUID
   - If invalid, return `400 INVALID_QUERY_PARAMETERS`
7. If `accountId` is provided, find the account where:
   - `accounts.id` equals `accountId`
   - `accounts.user_id` equals authenticated `user_id`
8. If no account is found, return `404 ACCOUNT_NOT_FOUND`.
9. Find transactions owned by the authenticated user within the selected period.
   - Filter by `account_id` when `accountId` is provided
   - Join `accounts` to obtain each transaction currency
   - Include only `INCOME` and `EXPENSE`
   - Do not include `OPENING_BALANCE` in income or expense totals
10. Group transaction totals by account currency.
11. For each currency, calculate:
    - `totalIncome`: sum of `INCOME`
    - `totalExpense`: sum of `EXPENSE`
    - `netCashFlow`: `totalIncome - totalExpense`
12. Return `200 OK`.

```json
{
  "message": "Summary retrieved successfully",
  "data": {
    "period": {
      "month": 8,
      "year": 2026
    },
    "summary": [
      {
        "currency": "THB",
        "totalIncome": 35000,
        "totalExpense": 12500,
        "netCashFlow": 22500
      }
    ]
  }
}
```

### GET /reports/categories

1. Extract session token from the `Authorization: Bearer <token>` header.
2. If the token is missing or malformed, return `401 UNAUTHORIZED`.
3. Hash the session token.
4. Find an active session and its associated user by joining `sessions.user_id` with `users.id`.
   - `token_hash` matches the hashed token
   - `revoked_at IS NULL`
   - `expires_at > now()`
5. If no active session and user are found, return `401 UNAUTHORIZED`.
6. Validate query parameters:
   - `page` must be a positive integer; default to `1`
   - `limit` must be a positive integer; default to `20`; maximum `100`
   - `type` is optional; if provided, it must be `INCOME` or `EXPENSE`; default to `EXPENSE`
   - `accountId` is optional; if provided, it must be a UUID
   - `month` is optional; if provided, it must be an integer from `1` to `12`
   - `year` is optional; if provided, it must be a positive integer
   - `month` and `year` must be provided together
   - `startDate` and `endDate` are optional; if provided, they must be valid date/time values
   - `startDate` must not be after `endDate`
   - Do not allow `month`/`year` together with `startDate`/`endDate`
   - If no date filter is provided, default to the current month and year
   - If invalid, return `400 INVALID_QUERY_PARAMETERS`
7. If `accountId` is provided, find the account where:
   - `accounts.id` equals `accountId`
   - `accounts.user_id` equals authenticated `user_id`
8. If no account is found, return `404 ACCOUNT_NOT_FOUND`.
9. Calculate `offset = (page - 1) * limit`.
10. Find transactions owned by the authenticated user within the selected period.
    - Filter by `account_id` when `accountId` is provided
    - Filter by selected `type`
    - Join `accounts` to obtain each transaction currency
    - Left join `categories` because `category_id` can be `null`
    - Do not exclude a historical transaction when its category is inactive
    - Exclude `OPENING_BALANCE`
11. Group transactions by category and currency.
    - Transactions without a category are grouped as `Uncategorized`
    - Calculate `totalAmount` and `transactionCount` for each group
12. Calculate `percentage` of each category against the total amount in the same currency.
13. Sort by `totalAmount DESC`.
14. Apply `LIMIT` and `OFFSET`.
15. Count all matching category groups as `total`.
16. Calculate `totalPages = ceil(total / limit)`.
17. Return `200 OK`.

```json
{
  "message": "Category report retrieved successfully",
  "data": {
    "items": [
      {
        "category": {
          "id": "uuid",
          "name": "Food"
        },
        "type": "EXPENSE",
        "currency": "THB",
        "totalAmount": 3500,
        "transactionCount": 18,
        "percentage": 42.17
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### GET /reports/daily-allowance

1. Extract session token from the `Authorization: Bearer <token>` header.
2. If the token is missing or malformed, return `401 UNAUTHORIZED`.
3. Hash the session token.
4. Find an active session and its associated user by joining
   `sessions.user_id` with `users.id`.
   - `token_hash` matches the hashed token
   - `revoked_at IS NULL`
   - `expires_at > now()`
5. If no active session and user are found, return `401 UNAUTHORIZED`.
6. Get the current date and time using the application time zone
   (`Asia/Bangkok`).
7. Calculate the current period:
   - `month`: current month
   - `year`: current year
   - `startOfMonth`: the first day of the current month at `00:00:00`
   - `now`: current date and time
   - `daysRemaining`: number of calendar days from today through the last day
     of the current month, including today
8. Find transactions owned by the authenticated user where:
   - `transactions.user_id` equals authenticated `user_id`
   - `transaction_date >= startOfMonth`
   - `transaction_date <= now`
   - `type` is `INCOME` or `EXPENSE`
   - Do not include `OPENING_BALANCE`
   - Join `accounts` to obtain each transaction currency
   - Do not exclude historical transactions when their account is inactive
9. Group transaction totals by account currency.
10. Calculate the following for each currency:
    - `totalIncome`: sum of `INCOME`; return `0` when none exist
    - `totalExpense`: sum of `EXPENSE`; return `0` when none exist
    - `remainingAmount = totalIncome - totalExpense`
    - `dailyAllowance = max(remainingAmount, 0) / daysRemaining`
    - Round `dailyAllowance` to 2 decimal places
11. If no matching transactions exist, return an empty `items` array.
12. Return `200 OK`.

```json
{
  "message": "Daily allowance retrieved successfully",
  "data": {
    "period": {
      "month": 8,
      "year": 2026,
      "daysRemaining": 10
    },
    "items": [
      {
        "currency": "THB",
        "totalIncome": 500,
        "totalExpense": 300,
        "remainingAmount": 200,
        "dailyAllowance": 20
      }
    ]
  }
}
```

### GET /reports/daily-budget

1. Extract session token from the `Authorization: Bearer <token>` header.
2. If the token is missing or malformed, return `401 UNAUTHORIZED`.
3. Hash the session token.
4. Find an active session and its associated user by joining
   `sessions.user_id` with `users.id`.
   - `token_hash` matches the hashed token
   - `revoked_at IS NULL`
   - `expires_at > now()`
5. If no active session and user are found, return `401 UNAUTHORIZED`.
6. Get the current date and time using the application time zone
   (`Asia/Bangkok`).
7. Calculate the current period:
   - `month`: current month
   - `year`: current year
   - `startOfMonth`: the first day of the current month at `00:00:00`
   - `now`: current date and time
   - `daysRemaining`: number of calendar days from today through the last day
     of the current month, including today
8. Find budgets owned by the authenticated user where:
   - `budgets.user_id` equals authenticated `user_id`
   - `budgets.month` equals the current month
   - `budgets.year` equals the current year
   - Do not exclude a budget when its category is currently inactive
9. Group budgets by `currency` and calculate `totalBudget`.
   - Return the sum of `budgets.amount` as `totalBudget`
10. Find expense transactions that belong to a category with a budget in the
    current period.
    - `transactions.user_id` equals authenticated `user_id`
    - `transactions.type = 'EXPENSE'`
    - `transaction_date >= startOfMonth`
    - `transaction_date <= now`
    - Join `budgets` using `user_id`, `category_id`, `month`, and `year`
    - Join `accounts` to obtain the transaction currency
    - `accounts.currency` equals `budgets.currency`
    - Do not include expenses from categories without a budget
11. Group matching expense transactions by budget currency and calculate
    `budgetSpent`.
    - Return `0` when no matching expense transactions exist
12. Calculate the following for each currency:
    - `budgetRemaining = totalBudget - budgetSpent`
    - `budgetRemainingPerDay = max(budgetRemaining, 0) / daysRemaining`
    - `overspentAmount = max(budgetSpent - totalBudget, 0)`
    - Round `budgetRemainingPerDay` to 2 decimal places
13. If no budgets exist for the current period, return an empty `items` array.
14. Return `200 OK`.

```json
{
  "message": "Daily budget report retrieved successfully",
  "data": {
    "period": {
      "month": 8,
      "year": 2026,
      "daysRemaining": 10
    },
    "items": [
      {
        "currency": "THB",
        "totalBudget": 500,
        "budgetSpent": 300,
        "budgetRemaining": 200,
        "budgetRemainingPerDay": 20,
        "overspentAmount": 0
      }
    ]
  }
}
```
