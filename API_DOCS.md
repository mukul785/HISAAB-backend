# HISAAB API - Detailed Documentation

Base URL: `https://hisaab-backend-ib1n.onrender.com/api`

---

## Auth

### Register
- **Endpoint:** `POST /auth/register`
- **Description:** Register a new user and create a default account
- **Auth Required:** No
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "account_name": "My Main Account"
  }
  ```
- **Sample Response:**
  ```json
  {
    "user": {
      "id": "...",
      "name": "Test User",
      "email": "test@example.com",
      "createdAt": "...",
      "updatedAt": "..."
    },
    "access_token": "<JWT>",
    "token_type": "bearer",
    "account": {
      "id": "...",
      "user_id": "...",
      "name": "My Main Account",
      "balance": 0.0,
      "created_at": "...",
      "updated_at": "..."
    }
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

### Update User Name
- **Endpoint:** `PATCH /auth/me`
- **Description:** Update the authenticated user’s name
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "name": "New Name"
  }
  ```
- **Sample Response:**
  ```json
  {
    "user": {
      "id": "...",
      "name": "New Name",
      "email": "test@example.com"
    }
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

### Delete User
- **Endpoint:** `DELETE /auth/me`
- **Description:** Delete the authenticated user and all related data
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  { "message": "User and related data deleted" }
  ```

---

### Inspect Token (Debug)
- **Endpoint:** `GET /auth/inspect-token`
- **Description:** Debug endpoint to inspect JWT token claims (development only)
- **Auth Required:** No (but requires token in header)
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  {
    "header": { "alg": "HS256", "typ": "JWT" },
    "payload": { "userId": "...", "iat": 1713264000, "exp": 1715856000 },
    "analysis": {
      "issued_at": "2026-04-16T10:00:00.000Z",
      "expires_at": "2026-05-16T10:00:00.000Z",
      "expires_in_seconds": 2592000,
      "expires_in_hours": "720.00",
      "expires_in_days": "30.00",
      "is_expired": false,
      "is_valid": true,
      "is_blacklisted": false,
      "verify_error": null
    }
  }
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
    "name": "Bank Account"
  }
  ```
- **Notes:**
  - Initial balance is always `0.0`; omit the `balance` field.
  - If a non-zero `balance` is provided, the API returns `400`.
  - If `balance` is provided as `0`, it is ignored and set to `0.0`.
- **Error Response (400):**
  ```json
  { "message": "Initial balance must be zero; omit balance field" }
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
- **Description:** Update an account (account name is editable)
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "name": "Updated Name"
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
- **Notes:**
  - You cannot delete the last remaining account; the API returns `400`.
  - If the deleted account was the default, another existing account is automatically set as default.
- **Error Response (400):**
  ```json
  { "message": "Cannot delete the last account. User must have at least one account." }
  ```
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

### Set Default Account
- **Endpoint:** `PATCH /accounts/{account_id}/set-default`
- **Description:** Set the specified account as the default for the current user. Unsets the default flag for all other accounts of the user.
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Request:**
  ```http
  PATCH /accounts/123e4567-e89b-12d3-a456-426614174000/set-default
  Authorization: Bearer <access_token>
  ```
- **Sample Response:**
  ```json
  {
    "message": "Default account updated",
    "account": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "user_id": "...",
      "name": "My Main Account",
      "balance": 0.0,
      "default": true,
      "created_at": "...",
      "updated_at": "..."
    }
  }
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
- **Description:** Get total sales, expenses, and balance for a specific account
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Query Params:** `account_id` (required)
- **Sample Response:**
  ```json
  {
    "total_sales": 1000.0,
    "total_expenses": 500.0,
    "balance": 2000.0
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

## Inventory

### Categories

#### List Categories
- **Endpoint:** `GET /inventory/categories`
- **Description:** List all inventory categories for the current user
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  [
    {
      "id": "...",
      "user_id": "...",
      "name": "Electronics",
      "description": "Electronic devices and accessories",
      "created_at": "...",
      "updated_at": "..."
    }
  ]
  ```

---

#### Create Category
- **Endpoint:** `POST /inventory/categories`
- **Description:** Create a new inventory category
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "name": "Electronics",
    "description": "Electronic devices and accessories"
  }
  ```
- **Sample Response:**
  ```json
  {
    "id": "...",
    "user_id": "...",
    "name": "Electronics",
    "description": "Electronic devices and accessories",
    "created_at": "...",
    "updated_at": "..."
  }
  ```

---

#### Update Category
- **Endpoint:** `PUT /inventory/categories/{category_id}`
- **Description:** Update an inventory category
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "name": "Updated Category Name",
    "description": "Updated description"
  }
  ```
- **Sample Response:**
  ```json
  {
    "id": "...",
    "name": "Updated Category Name",
    "description": "Updated description",
    ...
  }
  ```

---

#### Delete Category
- **Endpoint:** `DELETE /inventory/categories/{category_id}`
- **Description:** Delete a category (items in category will have category_id set to null)
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  - Status: 204 No Content

---

### Inventory Items

#### List Inventory Items
- **Endpoint:** `GET /inventory/`
- **Description:** List all inventory items with pagination, filtering, and search
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Query Params (optional):**
  - `page` - Page number (default: 1)
  - `limit` - Items per page (default: 50, use "all" for no pagination)
  - `search` - Search by name, SKU, or description
  - `category_id` - Filter by category UUID
  - `is_active` - Filter by active status (true/false)
  - `low_stock` - Filter items below threshold (true/false)
  - `sort` - Sort field (name, sku_id, stock_quantity, sell_price, cost_price, created_at, updated_at)
  - `order` - Sort order (asc/desc, default: desc)
- **Sample Request:** `GET /inventory?page=1&limit=20&search=iphone&sort=name&order=asc`
- **Sample Response:**
  ```json
  {
    "items": [
      {
        "id": "...",
        "name": "iPhone 15 Pro",
        "sku_id": "SKU-A7X9K2M4",
        "stock_quantity": 50,
        "sell_price": 999.99,
        "cost_price": 750.00,
        "category_id": "...",
        "image_url": "/uploads/images/inventory/...",
        "is_active": true,
        "low_stock_threshold": 5,
        "InventoryCategory": { "id": "...", "name": "Electronics" },
        "InventoryImages": [
          { "id": "...", "image_url": "...", "is_primary": true, "sort_order": 1 }
        ],
        "created_at": "...",
        "updated_at": "..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total_items": 150,
      "total_pages": 8
    }
  }
  ```

---

#### Create Inventory Item
- **Endpoint:** `POST /inventory/`
- **Description:** Create a new inventory item (with auto or manual SKU)
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body (Auto SKU):**
  ```json
  {
    "name": "iPhone 15 Pro",
    "description": "Latest iPhone model",
    "stock_quantity": 50,
    "sell_price": 999.99,
    "cost_price": 750.00,
    "auto_index": true,
    "category_id": "uuid-of-category",
    "low_stock_threshold": 5
  }
  ```
- **Body (Manual SKU):**
  ```json
  {
    "name": "Samsung Galaxy S24",
    "stock_quantity": 30,
    "sell_price": 899.99,
    "cost_price": 650.00,
    "auto_index": false,
    "sku_id": "SAMSUNG-S24-001"
  }
  ```
- **Sample Response:**
  ```json
  {
    "id": "...",
    "name": "iPhone 15 Pro",
    "sku_id": "SKU-A7X9K2M4",
    "stock_quantity": 50,
    "sell_price": 999.99,
    "cost_price": 750.00,
    "auto_index": true,
    "category_id": "...",
    "image_url": null,
    "is_active": true,
    "low_stock_threshold": 5,
    "created_at": "...",
    "updated_at": "..."
  }
  ```

---

#### Get Inventory Item
- **Endpoint:** `GET /inventory/{item_id}`
- **Description:** Get details of a specific inventory item with category and images
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  {
    "id": "...",
    "name": "iPhone 15 Pro",
    "sku_id": "SKU-A7X9K2M4",
    "stock_quantity": 50,
    "sell_price": 999.99,
    "cost_price": 750.00,
    "InventoryCategory": { "id": "...", "name": "Electronics" },
    "InventoryImages": [
      { "id": "...", "image_url": "...", "is_primary": true, "sort_order": 1 },
      { "id": "...", "image_url": "...", "is_primary": false, "sort_order": 2 }
    ],
    ...
  }
  ```

---

#### Update Inventory Item
- **Endpoint:** `PUT /inventory/{item_id}`
- **Description:** Update an inventory item
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "name": "Updated Name",
    "stock_quantity": 100,
    "sell_price": 1099.99,
    "is_active": true
  }
  ```
- **Sample Response:**
  ```json
  {
    "id": "...",
    "name": "Updated Name",
    "stock_quantity": 100,
    ...
  }
  ```

---

#### Delete Inventory Item
- **Endpoint:** `DELETE /inventory/{item_id}`
- **Description:** Delete an inventory item (also deletes all associated images)
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  - Status: 204 No Content

---

#### Adjust Stock
- **Endpoint:** `PATCH /inventory/{item_id}/stock`
- **Description:** Adjust stock quantity (increment or decrement)
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "adjustment": -5,
    "reason": "Sold 5 units"
  }
  ```
- **Sample Response:**
  ```json
  {
    "id": "...",
    "name": "iPhone 15 Pro",
    "sku_id": "SKU-A7X9K2M4",
    "previous_quantity": 50,
    "adjustment_applied": -5,
    "stock_quantity": 45,
    "reason": "Sold 5 units"
  }
  ```

---

#### Get Low Stock Items
- **Endpoint:** `GET /inventory/low-stock`
- **Description:** Get items that are at or below their low stock threshold
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  {
    "items": [
      {
        "id": "...",
        "name": "iPhone 15 Pro",
        "stock_quantity": 3,
        "low_stock_threshold": 5,
        ...
      }
    ],
    "count": 12
  }
  ```

---

#### Export Inventory
- **Endpoint:** `GET /inventory/export`
- **Description:** Export inventory to spreadsheet file
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Query Params (optional):** `format` (xlsx or csv, default: xlsx)
- **Sample Response:**
  - File download: `inventory_export_2026-04-16.xlsx`

---

### Bulk Upload

#### Upload Spreadsheet
- **Endpoint:** `POST /inventory/bulk-upload`
- **Description:** Upload a spreadsheet (Excel/CSV) to create multiple inventory items
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: multipart/form-data`
- **Body:** `file` (Excel .xlsx/.xls or CSV file, max 10MB)
- **Spreadsheet Format:**
  | Column | Required | Description |
  |--------|----------|-------------|
  | name | Yes | Item name |
  | stock_quantity | Yes | Integer |
  | sell_price | Yes | Decimal |
  | cost_price | Yes | Decimal |
  | sku_id | No | If empty, auto-generated |
  | category | No | Category name (created if not exists) |
  | description | No | Item description |
  | low_stock_threshold | No | Integer (default: 10) |
- **Sample Response:**
  ```json
  {
    "upload_id": "...",
    "status": "completed",
    "total_rows": 150,
    "success_count": 148,
    "error_count": 2,
    "error_details": [
      { "row": 45, "field": "sell_price", "error": "Invalid sell_price" },
      { "row": 89, "field": "sku_id", "error": "SKU \"ABC123\" already exists" }
    ]
  }
  ```

---

#### Get Bulk Upload Status
- **Endpoint:** `GET /inventory/bulk-upload/{upload_id}`
- **Description:** Get the status and results of a bulk upload
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  {
    "id": "...",
    "user_id": "...",
    "filename": "inventory.xlsx",
    "status": "completed",
    "total_rows": 150,
    "success_count": 148,
    "error_count": 2,
    "error_details": [...],
    "created_at": "..."
  }
  ```

---

### Item Images

**Note:** Each inventory item can have up to 10 images. The first image uploaded is automatically set as primary.

#### List Item Images
- **Endpoint:** `GET /inventory/{item_id}/images`
- **Description:** Get all images for an inventory item
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  {
    "item_id": "...",
    "images": [
      {
        "id": "...",
        "image_url": "/uploads/images/inventory/...",
        "is_primary": true,
        "sort_order": 1,
        "created_at": "..."
      },
      {
        "id": "...",
        "image_url": "/uploads/images/inventory/...",
        "is_primary": false,
        "sort_order": 2,
        "created_at": "..."
      }
    ],
    "count": 2
  }
  ```

---

#### Add Item Image
- **Endpoint:** `POST /inventory/{item_id}/images`
- **Description:** Add a new image to an inventory item (max 10 per item)
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: multipart/form-data`
- **Body:** `image` (JPEG, PNG, WebP, or GIF file, max 5MB)
- **Sample Response:**
  ```json
  {
    "id": "...",
    "item_id": "...",
    "image_url": "/uploads/images/inventory/...",
    "is_primary": true,
    "sort_order": 1,
    "created_at": "..."
  }
  ```

---

#### Delete Item Image
- **Endpoint:** `DELETE /inventory/{item_id}/images/{image_id}`
- **Description:** Delete a specific image (if primary is deleted, next image becomes primary)
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  { "message": "Image deleted" }
  ```

---

#### Set Primary Image
- **Endpoint:** `PATCH /inventory/{item_id}/images/{image_id}/primary`
- **Description:** Set an image as the primary image for the item
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  {
    "message": "Primary image updated",
    "image": {
      "id": "...",
      "image_url": "...",
      "is_primary": true,
      ...
    }
  }
  ```

---

#### Reorder Images
- **Endpoint:** `PUT /inventory/{item_id}/images/reorder`
- **Description:** Reorder images for an inventory item
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "image_order": ["image3-uuid", "image1-uuid", "image2-uuid"]
  }
  ```
- **Sample Response:**
  ```json
  {
    "message": "Image order updated",
    "images": [
      { "id": "image3-uuid", "sort_order": 1, ... },
      { "id": "image1-uuid", "sort_order": 2, ... },
      { "id": "image2-uuid", "sort_order": 3, ... }
    ]
  }
  ```

---

## App Init & A/B Testing

The App Init system provides application initialization with A/B testing capabilities. Each user has personalized feature flags that control which features they see.

### App Init
- **Endpoint:** `POST /app/init`
- **Description:** Initialize the app and get user's A/B feature flags
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "client": "Android App",
    "version": "1.1",
    "device_info": {
      "os_version": "14",
      "device_model": "Pixel 8"
    }
  }
  ```
- **Sample Response:**
  ```json
  {
    "success": true,
    "user": {
      "id": "user-uuid",
      "name": "Test User",
      "email": "test@example.com"
    },
    "client_info": {
      "client": "Android App",
      "version": "1.1"
    },
    "ab_flags": {
      "csra": 0,
      "new_checkout": 1,
      "dark_mode": 0
    },
    "features_count": 3,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
  ```

---

### Get User's AB Values
- **Endpoint:** `GET /app/ab`
- **Description:** Get all A/B feature values for the authenticated user
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  {
    "success": true,
    "user_id": "user-uuid",
    "ab_values": [
      {
        "feature_key": "csra",
        "name": "CSRA Feature",
        "description": "Customer Service Response Automation",
        "value": 0,
        "is_assigned": true,
        "assigned_at": "2024-01-15T10:30:00.000Z",
        "source": "auto"
      }
    ],
    "total_features": 1
  }
  ```

---

### Switch User's AB Value
- **Endpoint:** `PATCH /app/ab/{feature_key}`
- **Description:** Toggle/switch a specific A/B feature for the authenticated user
- **Auth Required:** Yes
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "value": 1
  }
  ```
  Note: `value` can be `0`, `1`, `true`, or `false`
- **Sample Response:**
  ```json
  {
    "success": true,
    "feature_key": "csra",
    "name": "CSRA Feature",
    "previous_value": 0,
    "new_value": 1,
    "message": "A/B flag \"csra\" updated to 1"
  }
  ```

---

## Admin - A/B Feature Management

### Get All Features
- **Endpoint:** `GET /app/admin/features`
- **Description:** Get all A/B features with usage statistics
- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  {
    "success": true,
    "features": [
      {
        "id": "feature-uuid",
        "feature_key": "csra",
        "name": "CSRA Feature",
        "description": "Customer Service Response Automation",
        "default_value": false,
        "is_active": true,
        "rollout_percentage": 50,
        "metadata": null,
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:00:00.000Z",
        "stats": {
          "total_users": 100,
          "experiment_users": 48
        }
      }
    ],
    "total": 1
  }
  ```

---

### Create Feature
- **Endpoint:** `POST /app/admin/features`
- **Description:** Create a new A/B feature
- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "feature_key": "new_feature",
    "name": "New Feature",
    "description": "Description of the new feature",
    "default_value": false,
    "is_active": true,
    "rollout_percentage": 25,
    "metadata": {
      "experiment_id": "exp-123"
    }
  }
  ```
- **Sample Response:**
  ```json
  {
    "success": true,
    "feature": {
      "id": "feature-uuid",
      "feature_key": "new_feature",
      "name": "New Feature",
      ...
    },
    "message": "Feature \"new_feature\" created successfully"
  }
  ```

---

### Update Feature
- **Endpoint:** `PATCH /app/admin/features/{feature_key}`
- **Description:** Update an existing A/B feature
- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "name": "Updated Feature Name",
    "is_active": false,
    "rollout_percentage": 75
  }
  ```
- **Sample Response:**
  ```json
  {
    "success": true,
    "feature": { ... },
    "message": "Feature \"new_feature\" updated successfully"
  }
  ```

---

### Delete Feature
- **Endpoint:** `DELETE /app/admin/features/{feature_key}`
- **Description:** Delete an A/B feature and all associated user configurations
- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  {
    "success": true,
    "message": "Feature \"new_feature\" deleted along with 50 user configurations"
  }
  ```

---

### Get AB Values for Specific User
- **Endpoint:** `GET /app/admin/users/{user_id}/ab`
- **Description:** Get all A/B feature values for a specific user
- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <access_token>`
- **Sample Response:**
  ```json
  {
    "success": true,
    "user": {
      "id": "user-uuid",
      "name": "Test User",
      "email": "test@example.com"
    },
    "ab_values": [
      {
        "feature_key": "csra",
        "name": "CSRA Feature",
        "is_active": true,
        "value": 1,
        "is_assigned": true,
        "assigned_at": "2024-01-15T10:30:00.000Z",
        "source": "manual"
      }
    ],
    "total_features": 1
  }
  ```

---

### Set AB Value for Specific User
- **Endpoint:** `PATCH /app/admin/users/{user_id}/ab/{feature_key}`
- **Description:** Set A/B value for a specific user
- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "value": 1
  }
  ```
- **Sample Response:**
  ```json
  {
    "success": true,
    "user_id": "user-uuid",
    "feature_key": "csra",
    "previous_value": 0,
    "new_value": 1,
    "message": "A/B flag \"csra\" for user user-uuid updated to 1"
  }
  ```

---

### Bulk Assign AB Values
- **Endpoint:** `POST /app/admin/features/{feature_key}/bulk-assign`
- **Description:** Assign A/B value to multiple users at once
- **Auth Required:** Yes (Admin)
- **Headers:** `Authorization: Bearer <access_token>`, `Content-Type: application/json`
- **Body:**
  ```json
  {
    "user_ids": ["user-uuid-1", "user-uuid-2", "user-uuid-3"],
    "value": 1
  }
  ```
- **Sample Response:**
  ```json
  {
    "success": true,
    "feature_key": "csra",
    "value": 1,
    "total_processed": 3,
    "successful": 3
  }
  ```

---

**Note:** All endpoints except register/login require `Authorization: Bearer <access_token>` header.