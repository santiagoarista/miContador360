// Supabase Edge Function for PayU Payment Processing
// Handles payment requests and forwards to PayU API

import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const paymentData = await req.json();
    
    console.log('[PayU Function] Processing payment:', {
      referenceCode: paymentData.referenceCode,
      amount: paymentData.amount,
      payer: paymentData.payerEmail,
    });

    // Build PayU request
    const payuRequest = {
      test: false,
      language: paymentData.language || 'es',
      command: 'SUBMIT_TRANSACTION',
      merchant: {
        apiLogin: paymentData.apiLogin,
        apiKey: paymentData.apiKey,
      },
      transaction: {
        order: {
          accountId: paymentData.accountId,
          referenceCode: paymentData.referenceCode,
          description: paymentData.description,
          language: paymentData.language || 'es',
          notifyUrl: paymentData.confirmationUrl,
          additionalValues: {
            TX_VALUE: {
              value: paymentData.amount,
              currency: paymentData.currency,
            },
            TX_TAX: {
              value: 0,
              currency: paymentData.currency,
            },
            TX_TAX_RETURN_BASE: {
              value: 0,
              currency: paymentData.currency,
            },
          },
          buyer: {
            merchantBuyerId: paymentData.payerId,
            fullName: paymentData.payerFullName,
            emailAddress: paymentData.payerEmail,
            contactPhone: paymentData.payerPhone,
            billingAddress: {
              street1: 'N/A',
              street2: 'N/A',
              city: 'Bogotá',
              state: 'Cundinamarca',
              country: 'CO',
              postalCode: '0000',
              phone: paymentData.payerPhone,
            },
          },
        },
        payer: {
          merchantPayerId: paymentData.payerId,
          fullName: paymentData.payerFullName,
          emailAddress: paymentData.payerEmail,
          contactPhone: paymentData.payerPhone,
          billingAddress: {
            street1: 'N/A',
            street2: 'N/A',
            city: 'Bogotá',
            state: 'Cundinamarca',
            country: 'CO',
            postalCode: '0000',
            phone: paymentData.payerPhone,
          },
        },
        creditCard: {
          number: paymentData.creditCardNumber,
          securityCode: paymentData.creditCardSecurityCode,
          expirationDate: paymentData.creditCardExpiryDate,
          name: paymentData.creditCardName,
        },
        extraParameters: {
          RESPONSE_URL: paymentData.responseUrl,
        },
        type: 'AUTHORIZATION_AND_CAPTURE',
        paymentMethod: 'VISA',
        paymentCountry: 'CO',
        deviceSessionId: crypto.randomUUID(),
        ipAddress: '192.168.1.1',
        userAgent: 'PayU Integration',
      },
    };

    console.log('[PayU Function] Sending request to PayU API');

    // Send to PayU API
    const payuResponse = await fetch(
      'https://sandbox.api.payulatam.com/payments-api/4.0/service.cgi',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payuRequest),
      }
    );

    const responseData = await payuResponse.json();
    console.log('[PayU Function] PayU Response:', responseData);

    // Extract transaction info from response
    const result: {
      success: boolean;
      transactionState: string | null;
      transactionId: string | null;
      threeDomainSecurityUrl: string | null;
    } = {
      success: false,
      transactionState: null,
      transactionId: null,
      threeDomainSecurityUrl: null,
    };

    if (responseData.code === 'SUCCESS' && responseData.transactionResponse) {
      const txResponse = responseData.transactionResponse;
      result = {
        success: txResponse.state === 'AUTHORIZATION_AND_CAPTURE' || txResponse.responseCode === 'APPROVED',
        transactionState: txResponse.responseCode === 'APPROVED' ? '4' : '6',
        transactionId: txResponse.transactionId,
        // Check for 3DS redirect
        threeDomainSecurityUrl: txResponse.threeDomainSecurityUrl || null,
      };
    } else if (responseData.error) {
      console.error('[PayU Function] PayU Error:', responseData.error);
      result.success = false;
      result.transactionState = '104';
    }

    // Update subscription in Supabase if needed
    if (result.success) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            payu_transaction_id: result.transactionId,
            subscription_start_date: new Date().toISOString(),
            subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('payu_reference_code', paymentData.referenceCode);

        if (updateError) {
          console.error('[PayU Function] Error updating subscription:', updateError);
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[PayU Function] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (error as Error).message }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
