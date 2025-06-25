# HISAAB API - Detailed Documentation

Base URL: `http://localhost:3000/api`

---

## Auth

### Register
- **Endpoint:** `POST /auth/register`
- **Description:** Register a new user
- **Auth Required:** No
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }
  ```
- **Sample Response:**
  ```json
  {
    "id": "...",
    "name": "Test User",
    "email": "test@example.com",
    "createdAt": "...",
    "updatedAt": "..."
  }
  ```

---

### Login
- **Endpoint:** `POST /auth/login`
- **Description:** Login and get JWT token
- **Auth Required:** No
- **Headers:** `Content-Type: application/json` or `application/x-www-form-urlencoded`
- **Body:**
  ```json
  {
    "username": "test@example.com",
    "password": "password123"
  }
  ```
- **Sample Response:**
  ```json
  {
    "access_token": "<JWT>",
    "token_type": "bearer"
  }
  ```

---

### Me
- **Endpoint:** `GET /auth/me`
- **Description:** Get current user info
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  {
    "id": "...",
    "name": "Test User",
    "email": "test@example.com",
    ...
  }
  ```

---

### Logout
- **Endpoint:** `POST /auth/logout`
- **Description:** Logout (JWT blacklist)
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  { "message": "Logged out" }
  ```

---

## Accounts

### List Accounts
- **Endpoint:** `GET /accounts/`
- **Description:** List all accounts for the current user
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  [
    {
      "id": "...",
      "user_id": "...",
      "name": "Cash",
      "balance": 1000.0,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
  ```

---

### Create Account
- **Endpoint:** `POST /accounts/`
- **Description:** Create a new account
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "name": "Bank Account",
    "balance": 0.0
  }
  ```
- **Sample Response:**
  ```json
  {
    "id": "...",
    "user_id": "...",
    "name": "Bank Account",
    "balance": 0.0,
    "created_at": "...",
    "updated_at": "..."
  }
  ```

---

### Get Account
- **Endpoint:** `GET /accounts/{account_id}`
- **Description:** Get details of a specific account
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  {
    "id": "...",
    "user_id": "...",
    "name": "Bank Account",
    "balance": 0.0,
    "created_at": "...",
    "updated_at": "..."
  }
  ```

---

### Update Account
- **Endpoint:** `PUT /accounts/{account_id}`
- **Description:** Update an account
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "name": "Updated Name",
    "balance": 500.0
  }
  ```
- **Sample Response:**
  ```json
  {
    "id": "...",
    "user_id": "...",
    "name": "Updated Name",
    "balance": 500.0,
    "created_at": "...",
    "updated_at": "..."
  }
  ```

---

### Delete Account
- **Endpoint:** `DELETE /accounts/{account_id}`
- **Description:** Delete an account
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  - Status: 204 No Content

---

### List Account Transactions
- **Endpoint:** `GET /accounts/{account_id}/transactions`
- **Description:** List all transactions for a specific account
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Query Params (optional):** `start_date`, `end_date`, `transaction_type`
- **Sample Response:**
  ```json
  [
    {
      "id": "...",
      "amount": 100.0,
      "description": "Deposit",
      "transaction_type": "sale",
      "category": "income",
      "date": "...",
      "user_id": "...",
      "account_id": "..."
    }
  ]
  ```

---

### Get Total Balance
- **Endpoint:** `GET /accounts/balance/`
- **Description:** Get the aggregated balance for all accounts
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  { "total_balance": 1000.0 }
  ```

---

## Transactions

### List Transactions
- **Endpoint:** `GET /transactions/`
- **Description:** List all transactions (with optional filters)
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Query Params (optional):** `start_date`, `end_date`, `transaction_type`, `category`, `account_id`
- **Sample Response:**
  ```json
  [
    {
      "id": "...",
      "amount": 100.0,
      "description": "Deposit",
      "transaction_type": "sale",
      "category": "income",
      "date": "...",
      "user_id": "...",
      "account_id": "..."
    }
  ]
  ```

---

### Create Transaction
- **Endpoint:** `POST /transactions/`
- **Description:** Create a new transaction
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "amount": 100.0,
    "description": "Deposit",
    "transaction_type": "sale",
    "category": "income",
    "date": "2024-06-01T12:00:00Z",
    "account_id": "..."
  }
  ```
- **Sample Response:**
  ```json
  {
    "id": "...",
    "amount": 100.0,
    "description": "Deposit",
    "transaction_type": "sale",
    "category": "income",
    "date": "...",
    "user_id": "...",
    "account_id": "..."
  }
  ```

---

### Get Transaction
- **Endpoint:** `GET /transactions/{transaction_id}`
- **Description:** Get details of a specific transaction
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  {
    "id": "...",
    "amount": 100.0,
    "description": "Deposit",
    "transaction_type": "sale",
    "category": "income",
    "date": "...",
    "user_id": "...",
    "account_id": "..."
  }
  ```

---

### Update Transaction
- **Endpoint:** `PUT /transactions/{transaction_id}`
- **Description:** Update a transaction
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "amount": 200.0
  }
  ```
- **Sample Response:**
  ```json
  {
    "id": "...",
    "amount": 200.0,
    "description": "Deposit",
    "transaction_type": "sale",
    "category": "income",
    "date": "...",
    "user_id": "...",
    "account_id": "..."
  }
  ```

---

### Delete Transaction
- **Endpoint:** `DELETE /transactions/{transaction_id}`
- **Description:** Delete a transaction
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  - Status: 204 No Content

---

### Get Transaction Totals
- **Endpoint:** `GET /transactions/totals`
- **Description:** Get total sales and expenses
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  {
    "total_sales": 1000.0,
    "total_expenses": 500.0
  }
  ```

---

## Invoices

### List Invoices
- **Endpoint:** `GET /invoices/`
- **Description:** List all invoices (with optional filters)
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Query Params (optional):** `status`, `start_date`, `end_date`, `customer_name`
- **Sample Response:**
  ```json
  [
    {
      "id": "...",
      "invoice_number": "INV-001",
      "customer_name": "John Doe",
      "subtotal": 1000.0,
      "tax_amount": 180.0,
      "total_amount": 1180.0,
      ...
    }
  ]
  ```

---

### Create Invoice
- **Endpoint:** `POST /invoices/`
- **Description:** Create a new invoice
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "customer_name": "John Doe",
    "items": [
      {
        "description": "Product A",
        "quantity": 2,
        "unit_price": 500.0
      }
    ]
  }
  ```
- **Sample Response:**
  ```json
  {
    "id": "...",
    "invoice_number": "INV-001",
    "customer_name": "John Doe",
    "subtotal": 1000.0,
    "tax_amount": 180.0,
    "total_amount": 1180.0,
    ...
  }
  ```

---

### Get Invoice
- **Endpoint:** `GET /invoices/{invoice_id}`
- **Description:** Get details of a specific invoice
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  {
    "id": "...",
    "invoice_number": "INV-001",
    "customer_name": "John Doe",
    ...
  }
  ```

---

### Update Invoice
- **Endpoint:** `PUT /invoices/{invoice_id}`
- **Description:** Update an invoice
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "customer_name": "Jane Doe"
  }
  ```
- **Sample Response:**
  ```json
  {
    "id": "...",
    "customer_name": "Jane Doe",
    ...
  }
  ```

---

### Delete Invoice
- **Endpoint:** `DELETE /invoices/{invoice_id}`
- **Description:** Delete an invoice
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  - Status: 204 No Content

---

### Mark Invoice as Paid
- **Endpoint:** `POST /invoices/{invoice_id}/mark-as-paid`
- **Description:** Mark invoice as paid and create a transaction
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  {
    "id": "...",
    "status": "paid",
    ...
  }
  ```

---

### Recalculate Invoice Taxes
- **Endpoint:** `POST /invoices/{invoice_id}/recalculate-taxes`
- **Description:** Recalculate taxes for an invoice
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Query Params (optional):** `tax_rate`
- **Sample Response:**
  ```json
  {
    "id": "...",
    "tax_amount": 200.0,
    ...
  }
  ```

---

## Tax

### Calculate GST
- **Endpoint:** `GET /tax/gst`
- **Description:** Calculate GST for a given amount
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Query Params:** `amount` (required), `tax_included` (optional), `tax_rate` (optional)
- **Sample Response:**
  ```json
  {
    "original_amount": 1000.0,
    "tax_rate": 18.0,
    "tax_amount": 180.0,
    "total_amount": 1180.0,
    "tax_included": false,
    "breakdown": { "cgst": 90.0, "sgst": 90.0 }
  }
  ```

---

### Calculate GST for Invoice
- **Endpoint:** `GET /tax/calculate-for-invoice/{invoice_id}`
- **Description:** Calculate GST for a specific invoice
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  {
    "original_amount": 1000.0,
    "tax_rate": 18.0,
    "tax_amount": 180.0,
    "total_amount": 1180.0,
    "tax_included": false,
    "breakdown": { "cgst": 90.0, "sgst": 90.0 }
  }
  ```

---

### Get Tax Filing
- **Endpoint:** `GET /tax/filing`
- **Description:** Retrieve tax filing data for a period
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Query Params:** `start_date` (required), `end_date` (required), `tax_type` (optional), `period` (optional)
- **Sample Response:**
  ```json
  {
    "summary": {
      "period_start": "2024-04-01",
      "period_end": "2024-06-30",
      "tax_type": "gst",
      "total_sales": 10000.0,
      "total_tax_collected": 1800.0,
      "total_tax_paid": 500.0,
      "net_tax_liability": 1300.0,
      "transaction_count": 20,
      "status": "draft"
    },
    "transactions": [ ... ]
  }
  ```

---

### Auto Generate Tax Filing
- **Endpoint:** `GET /tax/filing/auto-generate`
- **Description:** Automatically generate a tax filing for the most recent period
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:** (same as above)

---

### Submit Tax Filing
- **Endpoint:** `POST /tax/submit`
- **Description:** Submit tax filing information
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "period_start": "2024-04-01",
    "period_end": "2024-06-30",
    "tax_type": "gst",
    "total_tax_liability": 1300.0,
    "payment_reference": "TXN123",
    "notes": "Paid via bank"
  }
  ```
- **Sample Response:**
  ```json
  {
    "id": "...",
    "submission_date": "...",
    "period_start": "2024-04-01",
    "period_end": "2024-06-30",
    "tax_type": "gst",
    "total_tax_liability": 1300.0,
    "payment_reference": "TXN123",
    "confirmation_number": "CONFIRM123",
    "status": "submitted"
  }
  ```

---

### Get Tax Report
- **Endpoint:** `GET /tax/report`
- **Description:** Fetch historical tax reports
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Query Params:** `year` (required), `tax_type` (optional)
- **Sample Response:**
  ```json
  {
    "year": 2024,
    "total_tax_paid": 10000.0,
    "filings": []
  }
  ```

---

**Note:** All endpoints except register/login require `Authorization: Bearer <access_token>` header. 