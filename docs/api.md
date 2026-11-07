# API Documentation

## Base URL

Development: http://localhost:5000/api

## GST Verify Endpoint

### POST /gst/verify

Verifies a GSTIN and returns business metadata.

#### Request

```json
{
  "gstin": "29ABCDE1234F1Z5"
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "gstin": "29ABCDE1234F1Z5",
    "legalName": "SMF FABRICATIONS PRIVATE LIMITED",
    "tradeName": "SMF",
    "status": "Active",
    "registrationDate": "2019-05-12",
    "taxpayerType": "Regular",
    "state": "Karnataka",
    "address": "Peenya 2nd Stage, Bengaluru, Karnataka, India"
  }
}
```

## Invoice Endpoints

### GET /invoices

Returns all invoices.

### GET /invoices/:id

Returns one invoice.

### POST /invoices

Creates a new invoice.

### PUT /invoices/:id

Updates an invoice.

### DELETE /invoices/:id

Deletes an invoice.

### GET /customers

Returns saved customers.

### POST /customers

Creates or updates a customer record.

### GET /products

Returns saved product/service items.

### POST /products

Adds a product/service definition.

## Security Notes

- API keys are stored in environment variables only.
- No secret keys are exposed to the frontend.
- GST verification should use authorized API providers only.
- Do not bypass CAPTCHA, authentication, or government portal restrictions.
