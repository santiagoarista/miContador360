# PayU Subscription Payment - Deployment Guide

## Quick Start

This guide will walk you through deploying the PayU subscription payment integration.

## Prerequisites

- Supabase project already set up
- Node.js and npm installed
- PayU account (test or production)

## Step 1: Database Migration

Run the subscription table migration:

```bash
# Option 1: Using Supabase CLI (recommended)
supabase db push

# Option 2: Manual via Supabase Dashboard
# 1. Go to your Supabase project
# 2. Navigate to SQL Editor
# 3. Copy and run the content from migrations/create_subscriptions_table.sql
```

Verify the migration:
```sql
-- Check if table exists
SELECT * FROM subscriptions LIMIT 1;
```

## Step 2: Deploy Edge Function

Deploy the PayU confirmation webhook:

```bash
# Login to Supabase (if not already logged in)
supabase login

# Link to your project
supabase link --project-ref zijpwpflpuqyuwqnsrme

# Deploy the edge function
supabase functions deploy payu-confirmation
```

Set environment variables for the edge function:

```bash
# Set PayU API key
supabase secrets set PAYU_API_KEY=4Vj8eK4rloUd272L48hsrarnUA

# For production, use your production API key
# supabase secrets set PAYU_API_KEY=your_production_api_key
```

Verify deployment:
```bash
# Test the edge function
curl -X POST https://zijpwpflpuqyuwqnsrme.supabase.co/functions/v1/payu-confirmation \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Step 3: Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Update the following variables based on your environment:

### For Testing (Sandbox):
```env
VITE_PAYU_TEST_MODE=true
VITE_PAYU_MERCHANT_ID=508029
VITE_PAYU_API_KEY=4Vj8eK4rloUd272L48hsrarnUA
VITE_PAYU_ACCOUNT_ID=512321
VITE_PAYU_PAYMENT_URL=https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/
VITE_PAYU_CONFIRMATION_URL=https://zijpwpflpuqyuwqnsrme.supabase.co/functions/v1/payu-confirmation
```

### For Production:
```env
VITE_PAYU_TEST_MODE=false
VITE_PAYU_MERCHANT_ID=your_merchant_id
VITE_PAYU_API_KEY=your_api_key
VITE_PAYU_ACCOUNT_ID=your_account_id
VITE_PAYU_PAYMENT_URL=https://checkout.payulatam.com/ppp-web-gateway-payu/
VITE_PAYU_CONFIRMATION_URL=https://your-project.supabase.co/functions/v1/payu-confirmation
```

## Step 4: Install Dependencies

Install required packages:

```bash
npm install
```

No additional packages needed - the implementation uses native browser APIs for MD5 hashing.

## Step 5: Build and Deploy

### Local Development:
```bash
npm run dev
```

### Production Build:
```bash
npm run build
```

Deploy to your hosting platform (Vercel, Netlify, etc.):

```bash
# Example for Vercel
vercel --prod

# Example for Netlify
netlify deploy --prod
```

## Step 6: Configure PayU Merchant Panel

1. Log in to [PayU Merchant Panel](https://merchants.payulatam.com/)

2. Navigate to **Technical Configuration**

3. Set up URLs:
   - **Response URL**: `https://your-domain.com/payment/response`
   - **Confirmation URL**: `https://your-project.supabase.co/functions/v1/payu-confirmation`

4. Enable desired payment methods:
   - Credit/Debit Cards
   - PSE (Bank Transfer)
   - Cash payments (Baloto, Efecty)

5. Test the integration using test cards

## Step 7: Testing

### Test the complete flow:

1. **User Registration**:
   ```
   - Navigate to /login
   - Click "Crear Cuenta"
   - Fill in: Name, Email, Password
   - Submit
   ```

2. **Payment Page**:
   ```
   - Verify redirect to /subscription-payment
   - Check amount displays correctly (40,000 COP)
   - Click "Continuar al pago"
   ```

3. **PayU Checkout**:
   ```
   Use test card:
   - Card: 4097440000000004
   - CVV: 123
   - Expiry: 12/25
   - Name: TEST USER
   ```

4. **Payment Response**:
   ```
   - Verify redirect to /payment/response
   - Check transaction details
   - Verify successful message
   ```

5. **Database Verification**:
   ```sql
   SELECT * FROM subscriptions 
   WHERE user_id = 'your_user_id';
   ```

### Test Different Scenarios:

**Approved Payment**:
- Card: 4097440000000004
- Expected: Status = 'active'

**Declined Payment**:
- Card: 4097440000000028
- Expected: Status = 'cancelled'

**Pending Payment**:
- Card: 4666666666666669
- Expected: Status = 'pending'

## Step 8: Monitoring

### Check Edge Function Logs:
```bash
supabase functions logs payu-confirmation --tail
```

### Monitor Subscriptions:
```sql
-- Active subscriptions
SELECT COUNT(*) FROM subscriptions WHERE status = 'active';

-- Pending subscriptions
SELECT * FROM subscriptions WHERE status = 'pending';

-- Failed subscriptions
SELECT * FROM subscriptions WHERE status IN ('cancelled', 'expired');
```

## Troubleshooting

### Issue: Signature Verification Failed

**Solution**:
1. Verify API key is correct
2. Check amount formatting (must match exactly)
3. Ensure currency is 'COP'

```javascript
// Check signature calculation
const signatureString = `${apiKey}~${merchantId}~${referenceCode}~${amount}~COP`;
console.log('Signature string:', signatureString);
```

### Issue: Edge Function Not Receiving Requests

**Solution**:
1. Verify edge function is deployed:
   ```bash
   supabase functions list
   ```

2. Check edge function URL is correct in PayU panel

3. Test edge function directly:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/payu-confirmation \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "merchant_id=508029&reference_sale=TEST123&value=40000"
   ```

### Issue: Database RLS Policies

**Solution**:
Verify RLS policies are set correctly:

```sql
-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'subscriptions';

-- If missing, run the migration again
```

### Issue: CORS Errors

**Solution**:
Add CORS headers to edge function if needed (already configured).

## Production Checklist

Before going live, ensure:

- [ ] PayU production credentials configured
- [ ] `VITE_PAYU_TEST_MODE=false` set
- [ ] Edge function deployed and tested
- [ ] Database migration complete
- [ ] Confirmation URL configured in PayU panel
- [ ] Response URL configured in PayU panel
- [ ] SSL/HTTPS enabled on all URLs
- [ ] Test all payment scenarios
- [ ] Monitor edge function logs
- [ ] Set up alerts for failed payments
- [ ] Configure customer support emails
- [ ] Review and test subscription renewal logic (if implemented)

## Security Considerations

1. **Never expose API keys**: API keys should only be in server-side code or environment variables
2. **Always verify signatures**: Every PayU response should be signature-verified
3. **Use HTTPS**: All payment-related URLs must use HTTPS
4. **RLS Policies**: Ensure Row Level Security is enabled on subscriptions table
5. **Environment Variables**: Use environment variables for all sensitive data

## Next Steps

After deployment:

1. **Implement subscription renewal logic**
2. **Add email notifications** for payment confirmations
3. **Create admin dashboard** to manage subscriptions
4. **Add payment retry logic** for failed payments
5. **Implement refund handling**
6. **Add analytics** to track conversion rates

## Support Resources

- **PayU Documentation**: https://developers.payulatam.com/
- **PayU Support**: https://www.payulatam.com/co/soporte/
- **Supabase Docs**: https://supabase.com/docs
- **Project Issues**: Open an issue in the repository

## Rollback Plan

If issues occur in production:

1. Disable new signups temporarily
2. Revert to previous deployment
3. Check error logs:
   ```bash
   supabase functions logs payu-confirmation
   ```
4. Verify database state
5. Contact PayU support if payment issues persist

## Maintenance

Regular maintenance tasks:

- **Weekly**: Review failed transactions
- **Monthly**: Update exchange rate if needed
- **Quarterly**: Review and update test cards
- **Annually**: Renew SSL certificates (if self-managed)

---

**Last Updated**: March 11, 2026  
**Version**: 1.0.0
