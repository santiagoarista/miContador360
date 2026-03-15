// Supabase Edge Function for PayU Payment Processing
import { serve } from "std/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Simple SHA256 hash (PayU accepts SHA256 as signature)
const calculateSignature = async (text: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

serve(async (req: Request): Promise<Response> => {
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
    
    console.log('[PayU] Input data:', {
      expiryDate: paymentData.creditCardExpiryDate,
      amount: paymentData.amount,
      referenceCode: paymentData.referenceCode,
    });

    // Parse and convert expiry date: MM/YY -> YYYY/MM
    let expirationDate = paymentData.creditCardExpiryDate;
    if (expirationDate && expirationDate.includes('/')) {
      const [month, year] = expirationDate.split('/');
      const fullYear = year.length === 2 ? `20${year}` : year;
      expirationDate = `${fullYear}/${month}`;
      console.log('[PayU] Expiry date converted:', {
        from: paymentData.creditCardExpiryDate,
        to: expirationDate,
      });
    }

    // Calculate signature: apiKey~merchantId~referenceCode~amount~currency
    const signatureInput = `${paymentData.apiKey}~${paymentData.merchantId}~${paymentData.referenceCode}~${paymentData.amount}~${paymentData.currency}`;
    const signature = await calculateSignature(signatureInput);
    
    console.log('[PayU] Signature:', { input: signatureInput, hash: signature });

    // Build PayU request exactly as required
    const payuRequest = {
      test: false,
      language: 'es',
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
          language: 'es',
          signature: signature,
          notifyUrl: paymentData.confirmationUrl,
          additionalValues: {
            TX_VALUE: {
              value: parseInt(paymentData.amount),
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
            contactPhone: paymentData.payerPhone || '5700000000',
            dniNumber: '0000000000',
            shippingAddress: {
              street1: 'N/A',
              street2: 'N/A',
              city: 'Bogota',
              state: 'Cundinamarca',
              country: 'CO',
              postalCode: '000000',
              phone: paymentData.payerPhone || '5700000000',
            },
          },
          shippingAddress: {
            street1: 'N/A',
            street2: 'N/A',
            city: 'Bogota',
            state: 'Cundinamarca',
            country: 'CO',
            postalCode: '0000000',
            phone: paymentData.payerPhone || '5700000000',
          },
        },
        payer: {
          merchantPayerId: paymentData.payerId,
          fullName: paymentData.payerFullName,
          emailAddress: paymentData.payerEmail,
          contactPhone: paymentData.payerPhone || '5700000000',
          dniNumber: '0000000000',
          billingAddress: {
            street1: 'N/A',
            street2: 'N/A',
            city: 'Bogota',
            state: 'Cundinamarca',
            country: 'CO',
            postalCode: '000000',
            phone: paymentData.payerPhone || '5700000000',
          },
        },
        creditCard: {
          number: paymentData.creditCardNumber.replace(/\D/g, ''),
          securityCode: paymentData.creditCardSecurityCode,
          expirationDate: expirationDate,
          name: paymentData.creditCardName,
        },
        extraParameters: {
          INSTALLMENTS_NUMBER: 1,
        },
        type: 'AUTHORIZATION_AND_CAPTURE',
        paymentMethod: 'VISA',
        paymentCountry: 'CO',
        deviceSessionId: `device_${Date.now()}`,
        ipAddress: '192.168.1.1',
        userAgent: 'PayU-Integration',
      },
    };

    console.log('[PayU] Full request being sent');
    console.log('[PayU] Request expirationDate:', payuRequest.transaction.creditCard.expirationDate);
    console.log('[PayU] Request TX_VALUE:', payuRequest.transaction.order.additionalValues.TX_VALUE.value);
    console.log('[PayU] Request signature:', payuRequest.transaction.order.signature);

    // Send to PayU
    // PayU API expects form-encoded JSON (not direct JSON content-type)
    const formData = new URLSearchParams();
    formData.append('merchantId', paymentData.merchantId);
    formData.append('apiKey', paymentData.apiKey);
    formData.append('apiLogin', paymentData.apiLogin);
    
    // Send the full request as JSON stringified
    const payuResponse = await fetch(
      'https://sandbox.api.payulatam.com/payments-api/4.0/service.cgi',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payuRequest),
      }
    );

    // Get response as text first
    const responseText = await payuResponse.text();
    console.log('[PayU] Raw response status:', payuResponse.status);
    console.log('[PayU] Raw response length:', responseText.length);
    console.log('[PayU] Raw response (first 1000 chars):', responseText.substring(0, 1000));
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[PayU] Failed to parse response as JSON');
      console.error('[PayU] Parse error:', parseError.message);
      
      // PayU returned XML or error - return detailed error
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'PayU returned invalid/XML response - check logs',
          responsePreview: responseText.substring(0, 300),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('[PayU] Successfully parsed response JSON');

    // Parse PayU response
    let result: any = {
      success: false,
      transactionState: null,
      transactionId: null,
      threeDomainSecurityUrl: null,
    };

    if (responseData.code === 'SUCCESS' && responseData.transactionResponse) {
      const txResp = responseData.transactionResponse;
      result.success = txResp.state === 'APPROVED';
      result.transactionState = txResp.state;
      result.transactionId = txResp.transactionId;
      result.responseMessage = txResp.responseMessage;
    } else {
      result.payuError = responseData.error || 'Unknown error from PayU';
      result.transactionState = responseData.transactionResponse?.state || null;
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('[PayU] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Processing error',
        details: (error as Error).message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
