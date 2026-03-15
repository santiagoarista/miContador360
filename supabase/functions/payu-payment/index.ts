// Supabase Edge Function for PayU Payment Processing
// Handles payment requests and forwards to PayU API

import { serve } from "std/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey, x-supabase-auth',
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const paymentData = await req.json();
    
    // Validate required fields
    if (!paymentData.creditCardExpiryDate) {
      console.error('[PayU Function] Missing creditCardExpiryDate');
      return new Response(JSON.stringify({ error: 'Missing creditCardExpiryDate' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    
    console.log('[PayU Function] Processing payment:', {
      referenceCode: paymentData.referenceCode,
      amount: paymentData.amount,
      payer: paymentData.payerEmail,
      expiryDate: paymentData.creditCardExpiryDate,
    });

    // Generate a simple device session ID (ISO timestamp + random)
    const generateDeviceSessionId = () => {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      return `${timestamp}${random}`;
    };

    // Convert expiry date from MM/YY to YYYY/MM format
    let expirationDateFormatted = paymentData.creditCardExpiryDate;
    try {
      const expiryParts = paymentData.creditCardExpiryDate.split('/');
      if (expiryParts.length === 2) {
        let expiryMonth = expiryParts[0];
        let expiryYear = expiryParts[1];
        
        // If year is 2 digits, convert to 4 digits (28 -> 2028)
        if (expiryYear.length === 2) {
          const currentYear = new Date().getFullYear();
          const century = Math.floor(currentYear / 100) * 100;
          expiryYear = (century + parseInt(expiryYear)).toString();
        }
        
        expirationDateFormatted = `${expiryYear}/${expiryMonth}`;
      }
      console.log('[PayU Function] Expiry date conversion:', {
        original: paymentData.creditCardExpiryDate,
        formatted: expirationDateFormatted,
      });
    } catch (err) {
      console.error('[PayU Function] Error parsing expiry date:', err);
      throw new Error(`Invalid expiry date format: ${paymentData.creditCardExpiryDate}`);
    }

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
              value: `${paymentData.amount}`,
              currency: paymentData.currency,
            },
            TX_TAX: {
              value: '0',
              currency: paymentData.currency,
            },
            TX_TAX_RETURN_BASE: {
              value: '0',
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
              postalCode: '00000',
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
            postalCode: '00000',
            phone: paymentData.payerPhone,
          },
        },
        creditCard: {
          number: paymentData.creditCardNumber.replace(/\D/g, ''),
          securityCode: paymentData.creditCardSecurityCode,
          expirationDate: expirationDateFormatted,
          name: paymentData.creditCardName,
        },
        extraParameters: {
          RESPONSE_URL: paymentData.responseUrl,
        },
        type: 'AUTHORIZATION_AND_CAPTURE',
        paymentMethod: 'VISA',
        paymentCountry: 'CO',
        deviceSessionId: generateDeviceSessionId(),
        ipAddress: '192.168.1.1',
        userAgent: 'PayU Integration',
      },
    };

    console.log('[PayU Function] Sending request to PayU API');
    console.log('[PayU Function] PayU Request:', JSON.stringify(payuRequest, null, 2));

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
    console.log('[PayU Function] PayU Response:', JSON.stringify(responseData, null, 2));

    // Extract transaction info from response
    const result: {
      success: boolean;
      transactionState: string | null;
      transactionId: string | null;
      threeDomainSecurityUrl: string | null;
      payuError?: string;
    } = {
      success: false,
      transactionState: null,
      transactionId: null,
      threeDomainSecurityUrl: null,
    };

    if (responseData.code === 'SUCCESS' && responseData.transactionResponse) {
      const txResponse = responseData.transactionResponse;
      result.success = txResponse.state === 'AUTHORIZATION_AND_CAPTURE' || txResponse.responseCode === 'APPROVED';
      result.transactionState = txResponse.responseCode === 'APPROVED' ? '4' : '6';
      result.transactionId = txResponse.transactionId;
      result.threeDomainSecurityUrl = txResponse.threeDomainSecurityUrl || null;
    } else if (responseData.error) {
      console.error('[PayU Function] PayU Error:', responseData.error);
      result.success = false;
      result.transactionState = '104';
      result.payuError = responseData.error;
    } else if (responseData.transactionResponse?.responseCode !== 'APPROVED') {
      // PayU returned a response but not approved
      const txResponse = responseData.transactionResponse;
      console.error('[PayU Function] PayU Response Not Approved:', txResponse);
      result.success = false;
      result.transactionState = '104';
      result.payuError = txResponse?.responseMessage || 'Payment declined by PayU';
    }

    return new Response(JSON.stringify(result), {
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders,
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
          ...corsHeaders,
        },
      }
    );
  }
});
