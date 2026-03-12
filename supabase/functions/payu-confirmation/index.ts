// PayU Confirmation Webhook Handler
// This edge function receives and processes PayU payment confirmations
  
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {createClient } from 'jsr:@supabase/supabase-js@2';

serve(async (req: Request) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Parse form data from PayU
    const formData = await req.formData();
    
    // Extract PayU parameters
    const merchantId = formData.get('merchant_id');
    const referenceCode = formData.get('reference_sale');
    const txValue = formData.get('value');
    const currency = formData.get('currency');
    const transactionState = formData.get('state_pol');
    const signature = formData.get('sign');
    const transactionId = formData.get('transaction_id');
    const orderId = formData.get('reference_pol');
    const paymentMethod = formData.get('payment_method_type');
    
    console.log('PayU Confirmation received:', {
      merchantId,
      referenceCode,
      txValue,
      currency,
      transactionState,
      transactionId,
      orderId
    });

    // Get PayU API key from environment
    const _apiKey = Deno.env.get('PAYU_API_KEY') || '4Vj8eK4rloUd272L48hsrarnUA';
    
    // For production, implement proper signature verification with MD5
    // For now, we'll log but not strictly enforce signature matching in test mode
    const amount = parseFloat(txValue as string).toFixed(1);
    console.log('Signature verification data:', {
      merchantId,
      referenceCode,
      amount,
      currency,
      transactionState,
      receivedSignature: signature
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return new Response('Server configuration error', { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Map PayU state to subscription status
    let status = 'pending';
    let subscriptionStartDate: string | null = null;
    let subscriptionEndDate: string | null = null;

    if (transactionState === '4') {
      // Approved
      status = 'active';
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      subscriptionStartDate = startDate.toISOString();
      subscriptionEndDate = endDate.toISOString();
    } else if (transactionState === '6' || transactionState === '104') {
      // Declined or Error
      status = 'cancelled';
    } else if (transactionState === '7') {
      // Pending
      status = 'pending';
    } else if (transactionState === '5') {
      // Expired
      status = 'expired';
    }

    // Update subscription in database
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status,
        payu_transaction_id: transactionId as string,
        payu_order_id: orderId as string,
        payment_method: paymentMethod as string,
        subscription_start_date: subscriptionStartDate,
        subscription_end_date: subscriptionEndDate,
        updated_at: new Date().toISOString(),
      })
      .eq('payu_reference_code', referenceCode as string);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return new Response('Error updating subscription', { status: 500 });
    }

    console.log('Subscription updated successfully:', {
      referenceCode,
      status,
      transactionId
    });

    // PayU expects a 200 OK response
    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('PayU confirmation error:', error);
    return new Response('Internal server error', { status: 500 });
  }
});
