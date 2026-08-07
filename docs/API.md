# API Design: FlowPocket

## Authentication

### Register

`POST /auth/register`

Request body:

```json
{
  "email": "john@example.com",
  "password": "12345678",
  "name": "John"
}
```

Response `201 Created`:

```json
{
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "name": "John"
    }
  }
}
```

### Login

`POST /auth/login`

Request body:

```json
{
  "email": "john@example.com",
  "password": "12345678"
}
```

Response `200 OK`:

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

### Logout

`POST /auth/logout`

Response `200 OK`:

```json
{
  "message": "Logout successful"
}
```

### Me

`GET /auth/me`

Response `200 OK`:

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

## Account

### Create Account

`POST /accounts`

Request body:

```json
{
  "name": "SCB",
  "type": "BANK",
  "currency": "THB",
  "openingBalance": 10000
}
```

Response `201 CREATED`:

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

### Get Accounts

`GET /accounts`

Query parameters:

- `page` — page number
- `limit` — items per page

Response `200 OK`:

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

### Update Account

`PATCH /accounts/:id`

Request body:

```json
{
  "name": "SCB Main",
  "type": "BANK",
  "status": "ACTIVE"
}
```

Response `200 OK`:

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

### Delete Account

`DELETE /accounts/:id`

Response `200 OK`:

```json
{
  "message": "Accounts deleted successfully"
}
```

## Category

### Create Category

`POST /categories`

Request body:

```json
{
  "name": "Food",
  "type": "EXPENSE"
}
```

Response `201 CREATED`:

```json
{
  "message": "Category created successfully",
  "data": {
    "id": "uuid",
    "name": "Food",
    "type": "EXPENSE"
  }
}
```

### Get Categories

`GET /categories`

Response `200 OK`:

```json
{
  "message": "Categories retrieved successfully",
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "Food",
        "type": "EXPENSE",
        "category_status": "ACTIVE"
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
```

### Update Category

`PATCH /categories/:id`

Request body:

```json
{
  "name": "Food"
}
```

Response `200 OK`:

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

### Delete Category

`DELETE /categories/:id`

Response `200 OK`:

```json
{
  "message": "Category deleted successfully"
}
```

## Transaction

### Create transaction

`POST /transactions`

Request body:

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

Response `201 CREATED`:

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

### Get transactions

`GET /transactions`

Query parameters:

- `page` — page number
- `limit` — items per page
- `type` — optional filter
- `accountId` - optional filter
- `month` - optional filter
- `year` - optional filter
- `startDate` - optional filter
- `endDate` - optional filter

Response `200 OK`:

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

### Update transaction

`PATCH /transactions/:id`

Request body:

```json
{
  "amount": 300,
  "note": "Dinner"
}
```

Response `200 OK`:

```json
{
  "message": "Transaction updated successfully",
  "data": {
    "id": "uuid",
    "accountId": "uuid",
    "categoryId": "uuid",
    "type": "EXPENSE",
    "amount": 300,
    "note": "Lunch with team",
    "transactionDate": "2026-08-07T12:00:00Z"
  }
}
```

## Image

### Upload Image

`POST /transactions/:id/images`

Content-Type : multipart/form-data

Body : File

Response `201 CREATED`:

```json
{
  "message": "Image uploaded successfully",
  "data": {
    "id": "uuid",
    "transactionId": "uuid",
    "fileName": "receipt.jpg",
    "mimeType": "image/jpeg",
    "fileSize": 245678
  }
}
```

## Budget

### Create budget

`POST /budgets`

Request body:

```json
{
  "categoryId": "uuid",
  "amount": 5000,
  "month": 8,
  "year": 2026
  "currency" :"THB"
}
```

Response `201 CREATED`:

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

### Get Budgets

`GET /budgets`

Response `200 OK`:

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

## Session

### Get Sessions

`GET /sessions`

Response `200 OK`:

```json
{
  "message": "Sessions retrieved successfully",
  "data": {
    "items": [
      {
        "id": "uuid",
        "deviceName": "Chrome on macOS",
        "ipAddress": "203.0.113.10",
        "createdAt": "2026-08-07T12:00:00Z",
        "expiresAt": "2026-09-06T12:00:00Z",
        "revokedAt": null,
        "isCurrent": true
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

## Reports

### Report Summary

`GET /reports/summary`

Response `200 OK`:

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

### Report Categories

`GET /reports/categories`

Response `200 OK`:

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

### Report Daily

`GET /reports/daily-budget`

Response `200 OK`:

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
        "availableCash": 200,
        "availableCashPerDay": 20,
        "totalBudget": 500,
        "budgetSpent": 300,
        "budgetRemaining": 200,
        "budgetRemainingPerDay": 20
      }
    ]
  }
}
```
