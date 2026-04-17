# A/B Testing System Guide

This guide explains how to use the A/B testing system in HISAAB backend for feature rollouts and experiments.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Complete Workflow](#complete-workflow)
4. [API Reference](#api-reference)
5. [Code Implementation](#code-implementation)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The A/B system allows you to:
- Roll out features gradually to a percentage of users
- Test different implementations with different user groups
- Toggle features on/off without code deployment
- Track which features affect which endpoints/screens

### Key Concepts

| Term | Description |
|------|-------------|
| **Feature Key** | Unique identifier for the AB (e.g., `new_checkout`, `dark_mode`) |
| **Control Group (AB=0)** | Users who see the default/old behavior |
| **Experiment Group (AB=1)** | Users who see the new/experimental behavior |
| **Rollout Percentage** | % of new users automatically assigned to experiment group |

---

## Quick Start

### 1. Create the AB Feature

```bash
POST /api/app/admin/features
Authorization: Bearer <token>
Content-Type: application/json

{
  "feature_key": "new_transaction_list",
  "name": "New Transaction List UI",
  "description": "Redesigned transaction list with card layout",
  "rollout_percentage": 0,
  "status": "draft"
}
```

### 2. Implement in Your Controller

```javascript
import { hasFeature } from '../utils/abHelper.js';

export const getTransactions = async (req, res, next) => {
  if (await hasFeature(req, 'new_transaction_list')) {
    // AB=1: New implementation
    return res.json({ layout: 'cards', data: formattedData });
  }
  // AB=0: Default implementation
  return res.json({ layout: 'table', data: originalData });
};
```

### 3. Test & Roll Out

```bash
# Assign yourself to experiment group for testing
PATCH /api/app/ab/new_transaction_list
{ "value": 1 }

# Start gradual rollout
PATCH /api/app/admin/features/new_transaction_list
{ "status": "running", "rollout_percentage": 10 }
```

---

## Complete Workflow

### Step 1: Plan Your AB

Before writing code, define:
- What feature are you testing?
- What endpoints/screens will be affected?
- What's the control behavior vs experiment behavior?

### Step 2: Create AB Feature (Admin)

```bash
POST /api/app/admin/features
```

```json
{
  "feature_key": "enhanced_invoice_pdf",
  "name": "Enhanced Invoice PDF",
  "description": "New PDF template with better formatting and QR codes",
  
  "affected_endpoints": [
    "/api/invoices/:id/pdf",
    "/api/invoices/:id"
  ],
  "affected_screens": [
    "InvoiceDetail",
    "InvoicePreview",
    "PDFViewer"
  ],
  "affected_platforms": ["Android App", "iOS App", "Web"],
  
  "control_behavior": "Current PDF template with basic layout",
  "experiment_behavior": "New PDF with QR code, better typography, and itemized tax",
  
  "owner": "billing-team",
  "status": "draft",
  "rollout_percentage": 0,
  "tags": ["invoices", "pdf", "ui"]
}
```

### Step 3: Implement the Code

```javascript
// src/controllers/invoicesController.js

import { hasFeature, abResponse } from '../utils/abHelper.js';

// Method 1: Simple if/else
export const getInvoice = async (req, res, next) => {
  const invoice = await Invoice.findByPk(req.params.id);
  
  if (await hasFeature(req, 'enhanced_invoice_pdf')) {
    // Experiment: Enhanced response
    return res.json({
      ...invoice.toJSON(),
      pdf_version: 'v2',
      qr_code_url: generateQRCode(invoice.id),
      formatted_items: formatItemsEnhanced(invoice.items)
    });
  }
  
  // Control: Original response
  return res.json(invoice);
};

// Method 2: Using abResponse helper
export const getInvoiceV2 = async (req, res, next) => {
  const invoice = await Invoice.findByPk(req.params.id);
  
  const response = await abResponse(
    req,
    'enhanced_invoice_pdf',
    // Control response (AB=0)
    { data: invoice, version: 'v1' },
    // Experiment response (AB=1)
    { data: invoice, version: 'v2', qr_code: generateQR(invoice.id) }
  );
  
  return res.json(response);
};
```

### Step 4: Test Your Implementation

```bash
# Check your current AB value
GET /api/app/ab

# Switch yourself to experiment group
PATCH /api/app/ab/enhanced_invoice_pdf
{ "value": 1 }

# Test the endpoint - should return experiment response
GET /api/invoices/123

# Switch back to control group
PATCH /api/app/ab/enhanced_invoice_pdf
{ "value": 0 }

# Test again - should return control response
GET /api/invoices/123
```

### Step 5: Update Feature Documentation

After implementation, update the AB with any additional endpoints:

```bash
PATCH /api/app/admin/features/enhanced_invoice_pdf
{
  "affected_endpoints": [
    "/api/invoices/:id/pdf",
    "/api/invoices/:id",
    "/api/invoices/:id/send"  # Added during implementation
  ]
}
```

### Step 6: Gradual Rollout

```bash
# Start with 5% of users
PATCH /api/app/admin/features/enhanced_invoice_pdf
{
  "status": "running",
  "rollout_percentage": 5,
  "start_date": "2026-04-17"
}

# Monitor, then increase
PATCH /api/app/admin/features/enhanced_invoice_pdf
{ "rollout_percentage": 25 }

# Full rollout
PATCH /api/app/admin/features/enhanced_invoice_pdf
{ "rollout_percentage": 100 }

# Mark as completed
PATCH /api/app/admin/features/enhanced_invoice_pdf
{
  "status": "completed",
  "end_date": "2026-05-01"
}
```

---

## API Reference

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/app/init` | Initialize app, get all AB flags |
| `GET` | `/api/app/ab` | Get all AB values for current user |
| `PATCH` | `/api/app/ab/:feature_key` | Switch AB value for current user |
| `GET` | `/api/app/lookup?endpoint=X&screen=Y` | Find ABs affecting an endpoint/screen |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/app/admin/features` | List all features (with filters) |
| `POST` | `/api/app/admin/features` | Create new feature |
| `PATCH` | `/api/app/admin/features/:key` | Update feature |
| `DELETE` | `/api/app/admin/features/:key` | Delete feature |
| `GET` | `/api/app/admin/users/:id/ab` | Get AB values for specific user |
| `PATCH` | `/api/app/admin/users/:id/ab/:key` | Set AB value for specific user |
| `POST` | `/api/app/admin/features/:key/bulk-assign` | Bulk assign to multiple users |

### Query Parameters for Listing

```
GET /api/app/admin/features?status=running&owner=team&tag=ui&endpoint=/api/x&search=keyword
```

---

## Code Implementation

### Available Helpers

Import from `src/utils/abHelper.js`:

```javascript
import { 
  getUserABValue,    // Get boolean AB value for user
  getAllUserABValues, // Get all AB values as object
  hasFeature,         // Quick check in controllers
  requireFeature,     // Middleware to block if AB=0
  abResponse          // Return different response based on AB
} from '../utils/abHelper.js';
```

### Helper Examples

#### `hasFeature(req, featureKey)`
Most common - simple boolean check.

```javascript
export const createTransaction = async (req, res, next) => {
  if (await hasFeature(req, 'auto_categorization')) {
    req.body.category = await autoDetectCategory(req.body.description);
  }
  // Continue with creation...
};
```

#### `abResponse(req, key, controlResponse, experimentResponse)`
Return different data based on AB.

```javascript
export const getDashboard = async (req, res, next) => {
  const data = await getDashboardData(req.user.id);
  
  const response = await abResponse(req, 'new_dashboard',
    { version: 1, widgets: data.oldWidgets },
    { version: 2, widgets: data.newWidgets, recommendations: data.ai }
  );
  
  res.json(response);
};
```

#### `requireFeature(featureKey)`
Middleware to restrict endpoint access.

```javascript
import { requireFeature } from '../utils/abHelper.js';

// Only users with beta_features=1 can access
router.get('/beta/ai-insights', 
  authenticateJWT, 
  requireFeature('beta_features'), 
  aiInsightsController
);
```

#### `getUserABValue(userId, featureKey)`
Get value outside request context.

```javascript
// In a background job or service
const useNewAlgorithm = await getUserABValue(userId, 'new_recommendation_algo');
```

---

## Best Practices

### Naming Conventions

```
✅ Good: new_checkout, enhanced_search, dark_mode_v2
❌ Bad: test1, feature, ab123
```

Use descriptive, lowercase, snake_case keys.

### Feature Lifecycle

```
draft → running → paused (if issues) → running → completed → archived
```

### Cleanup After Experiment

Once an experiment concludes:

1. **If experiment wins**: Remove the AB check, keep experiment code
2. **If control wins**: Remove the AB check, keep control code
3. **Archive the feature**: `{ "status": "archived" }`

```javascript
// BEFORE (during experiment)
if (await hasFeature(req, 'new_checkout')) {
  return newCheckoutFlow();
}
return oldCheckoutFlow();

// AFTER (experiment won, cleanup)
return newCheckoutFlow();  // Just keep the winner
```

### Don't Nest AB Checks

```javascript
// ❌ Bad - confusing and hard to analyze
if (await hasFeature(req, 'feature_a')) {
  if (await hasFeature(req, 'feature_b')) {
    // ...
  }
}

// ✅ Good - separate concerns
const hasA = await hasFeature(req, 'feature_a');
const hasB = await hasFeature(req, 'feature_b');
// Use independently
```

### Document Behaviors

Always fill in `control_behavior` and `experiment_behavior`:

```json
{
  "control_behavior": "Invoice shows subtotal → tax → total",
  "experiment_behavior": "Invoice shows itemized tax (CGST/SGST) with HSN codes"
}
```

---

## Troubleshooting

### "Feature not found" error

The feature key doesn't exist. Create it first:
```bash
POST /api/app/admin/features
{ "feature_key": "your_feature", "name": "Your Feature" }
```

### AB value not changing

1. Check if feature is active: `"is_active": true`
2. Check feature status: should be `running`, not `draft`
3. Verify you're using the correct feature_key

### All users getting same value

Check `rollout_percentage`:
- `0` = all new users get control (AB=0)
- `100` = all new users get experiment (AB=1)

Existing users keep their assigned value.

### How to force specific users to experiment

```bash
# Single user
PATCH /api/app/admin/users/{user_id}/ab/{feature_key}
{ "value": 1 }

# Multiple users
POST /api/app/admin/features/{feature_key}/bulk-assign
{ "user_ids": ["id1", "id2"], "value": 1 }
```

### Finding which AB affects an endpoint

```bash
GET /api/app/lookup?endpoint=/api/transactions
```

---

## Example: Complete Feature Implementation

### Scenario: New AI-powered transaction categorization

**1. Create Feature**
```json
POST /api/app/admin/features
{
  "feature_key": "ai_categorization",
  "name": "AI Transaction Categorization",
  "description": "Auto-categorize transactions using ML",
  "affected_endpoints": ["/api/transactions"],
  "affected_screens": ["AddTransaction", "TransactionDetail"],
  "control_behavior": "User manually selects category from dropdown",
  "experiment_behavior": "Category auto-suggested based on description, user can override",
  "owner": "ml-team",
  "status": "draft",
  "rollout_percentage": 0,
  "tags": ["ai", "transactions", "ux"]
}
```

**2. Implement**
```javascript
// transactionsController.js
import { hasFeature } from '../utils/abHelper.js';
import { predictCategory } from '../services/mlService.js';

export const createTransaction = async (req, res, next) => {
  try {
    const { description, amount, category } = req.body;
    
    let finalCategory = category;
    let categorySource = 'manual';
    
    // AB: AI categorization
    if (await hasFeature(req, 'ai_categorization') && !category) {
      const prediction = await predictCategory(description);
      finalCategory = prediction.category;
      categorySource = 'ai';
    }
    
    const transaction = await Transaction.create({
      ...req.body,
      category: finalCategory,
      category_source: categorySource,  // Track for analytics
      user_id: req.user.id
    });
    
    res.status(201).json({
      transaction,
      category_suggested: categorySource === 'ai'
    });
  } catch (err) {
    next(err);
  }
};
```

**3. Test**
```bash
# Enable for yourself
PATCH /api/app/ab/ai_categorization
{ "value": 1 }

# Test creating transaction without category
POST /api/transactions
{ "description": "Uber ride to office", "amount": 250 }
# Should return: { "category": "Transport", "category_suggested": true }
```

**4. Roll out**
```bash
PATCH /api/app/admin/features/ai_categorization
{ "status": "running", "rollout_percentage": 10 }
```

---

## Questions?

Check the Postman collection `HISAAB_API.postman_collection.json` for all endpoint examples in the "App Init & A/B Testing" folder.
