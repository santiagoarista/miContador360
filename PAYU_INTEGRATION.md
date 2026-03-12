# PayU Integration Guide

This project integrates PayU Latam payment gateway for subscription payments in Colombia.

## Overview

When a user creates an account, they are redirected to a subscription payment page where they need to pay 40,000 COP (≈ $10 USD) for a monthly subscription.

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Update the following variables:
- `VITE_PAYU_MERCHANT_ID`: Your PayU Merchant ID
- `VITE_PAYU_API_KEY`: Your PayU API Key
- `VITE_PAYU_ACCOUNT_ID`: Your PayU Account ID (Colombia)
- `VITE_PAYU_TEST_MODE`: Set to `false` for production

### 2. Database Setup

Run the subscription table migration:

```bash
# Using Supabase CLI
supabase db push

# Or run the migration manually in Supabase SQL Editor
```

The migration file is located at: `/migrations/create_subscriptions_table.sql`

### 3. PayU Configuration

#### Test Credentials (Already configured)
- Merchant ID: `508029`
- API Key: `4Vj8eK4rloUd272L48hsrarnUA`
- Account ID: `512321` (Colombia)

#### Production Setup
1. Sign up at [PayU Merchants](https://merchants.payulatam.com/)
2. Get your production credentials
3. Update the environment variables
4. Set `VITE_PAYU_TEST_MODE=false`

### 4. Payment Flow

1. **User Registration**: User creates an account
2. **Redirect to Payment**: After successful registration, user is redirected to `/subscription-payment`
3. **Payment Processing**: User is redirected to PayU checkout
4. **Payment Response**: PayU redirects back to `/payment/response` with transaction details
5. **Status Update**: Subscription status is updated in the database
6. **Dashboard Access**: User gains access to the application

### 5. Supported Payment Methods

- Credit/Debit Cards (Visa, Mastercard, American Express)
- PSE (Electronic Bank Transfer - Colombia)
- Cash payments (Baloto, Efecty)
- Bank referenced payments

## File Structure

```
src/
├── lib/
│   └── payu.js                    # PayU integration utilities
├── pages/
│   ├── SubscriptionPayment.jsx    # Subscription payment page
│   └── PaymentResponse.jsx        # Payment confirmation page
migrations/
└── create_subscriptions_table.sql # Database migration
```

## API Reference

### PayU Configuration (`src/lib/payu.js`)

#### `generateSignature(referenceCode, amount, currency)`
Generates MD5 signature for PayU payment form.

#### `createPaymentFormData(user, referenceCode)`
Creates payment form data with all required PayU parameters.

#### `verifyResponseSignature(data)`
Verifies the PayU response signature for security.

#### `submitPayUForm(formData)`
Programmatically submits the payment form to PayU.

### Database Schema

**Table: `subscriptions`**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Reference to auth.users |
| status | VARCHAR | pending, active, cancelled, expired |
| amount | DECIMAL | Subscription amount |
| currency | VARCHAR | Currency code (COP) |
| payu_transaction_id | VARCHAR | PayU transaction ID |
| payu_reference_code | VARCHAR | Unique reference code |
| payu_order_id | VARCHAR | PayU order ID |
| payment_method | VARCHAR | Payment method used |
| subscription_start_date | TIMESTAMP | Start date |
| subscription_end_date | TIMESTAMP | End date (1 month) |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |

## Testing

### Test Cards (PayU Sandbox)

**Approved Transaction:**
- Card: 4097440000000004
- CVV: 123
- Expiry: Any future date

**Declined Transaction:**
- Card: 4097440000000028
- CVV: 123
- Expiry: Any future date

**Pending Transaction:**
- Card: 4666666666666669
- CVV: 123
- Expiry: Any future date

### Test Payment Flow

1. Register a new user
2. You'll be redirected to the subscription payment page
3. Click "Continuar al pago"
4. Use test card details above
5. Complete the PayU checkout
6. Verify redirection to payment response page
7. Check subscription status in database

## Production Checklist

- [ ] Update PayU credentials to production
- [ ] Set `VITE_PAYU_TEST_MODE=false`
- [ ] Configure PayU confirmation URL webhook
- [ ] Test payment flow end-to-end
- [ ] Set up subscription renewal logic
- [ ] Configure payment failure notifications
- [ ] Set up customer support for payment issues

## Troubleshooting

### Payment Signature Errors
- Verify API Key is correct
- Check amount formatting (must match exactly)
- Ensure currency code is correct (COP for Colombia)

### Database Errors
- Run the subscription migration
- Check RLS policies are enabled
- Verify user has proper permissions

### Redirect Issues
- Check response URL configuration
- Verify confirmation URL is accessible
- Check for CORS issues in production

## Security Notes

1. **API Key**: Never expose API Key in client-side code (used only for signature generation)
2. **Signature Verification**: Always verify PayU response signatures
3. **RLS Policies**: Ensure Row Level Security is enabled on subscriptions table
4. **HTTPS**: Use HTTPS in production for all payment-related pages

## Exchange Rate

The subscription is set to 40,000 COP (≈ $10 USD). Update `SUBSCRIPTION_AMOUNT` in `src/lib/payu.js` if exchange rates change significantly.

Current configuration:
```javascript
SUBSCRIPTION_AMOUNT: 40000, // COP
SUBSCRIPTION_AMOUNT_USD: 10, // USD
```

## Support

- PayU Documentation: https://developers.payulatam.com/
- PayU Support: https://www.payulatam.com/co/
- Technical Issues: Contact PayU technical support

## License

This integration is part of the main project. See main LICENSE file.
