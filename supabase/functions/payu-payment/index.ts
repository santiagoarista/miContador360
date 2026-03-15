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

    // Parse and convert expiry date: handle both formats
    // Input can be: "0628" (no slash) or "06/28" (with slash)
    // Output must be: "2028/06" (YYYY/MM format)
    let expirationDate = paymentData.creditCardExpiryDate;
    console.log('[PayU] Raw expiry input:', expirationDate);
    
    if (expirationDate) {
      let month = '';
      let year = '';
      
      if (expirationDate.includes('/')) {
        // Format: 06/28
        const parts = expirationDate.split('/');
        month = parts[0];
        year = parts[1];
      } else if (expirationDate.length === 4) {
        // Format: 0628
        month = expirationDate.substring(0, 2);
        year = expirationDate.substring(2, 4);
      }
      
      if (month && year) {
        const fullYear = year.length === 2 ? `20${year}` : year;
        expirationDate = `${fullYear}/${month}`;
        console.log('[PayU] Expiry date converted:', {
          from: paymentData.creditCardExpiryDate,
          to: expirationDate,
        });
      }
    }

    // ALWAYS use PayU Sandbox credentials (ignore frontend values)
    // Official PayU sandbox test credentials
    const apiLogin = 'pRRXKOl8ikMmt9u';
    const apiKey = '4Vj8eK4rloUd272L48hsrarnUA';
    const merchantId = '508029';
    const accountId = '512321';
    
    console.log('[PayU] Using SANDBOX credentials (forced)');
    
    // Calculate signature: apiKey~merchantId~referenceCode~amount~currency
    const signatureInput = `${apiKey}~${merchantId}~${paymentData.referenceCode}~${paymentData.amount}~${paymentData.currency}`;
    const signature = await calculateSignature(signatureInput);
    
    console.log('[PayU] Signature:', { input: signatureInput, hash: signature });

    // Build PayU request exactly as required
    const payuRequest = {
      test: false,
      language: 'es',
      command: 'SUBMIT_TRANSACTION',
      merchant: {
        apiLogin: apiLogin,
        apiKey: apiKey,
      },
      transaction: {
        order: {
          accountId: accountId,
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
            dniNumber: paymentData.payerDniNumber || '0000000000',
            shippingAddress: {
              street1: paymentData.shippingAddress?.street1 || 'N/A',
              street2: paymentData.shippingAddress?.street2 || 'N/A',
              city: paymentData.shippingAddress?.city || 'Bogota',
              state: paymentData.shippingAddress?.state || 'Cundinamarca',
              country: paymentData.shippingAddress?.country || 'CO',
              postalCode: paymentData.shippingAddress?.postalCode || '000000',
              phone: paymentData.payerPhone || '5700000000',
            },
          },
          shippingAddress: {
            street1: paymentData.shippingAddress?.street1 || 'N/A',
            street2: paymentData.shippingAddress?.street2 || 'N/A',
            city: paymentData.shippingAddress?.city || 'Bogota',
            state: paymentData.shippingAddress?.state || 'Cundinamarca',
            country: paymentData.shippingAddress?.country || 'CO',
            postalCode: paymentData.shippingAddress?.postalCode || '0000000',
            phone: paymentData.payerPhone || '5700000000',
          },
        },
        payer: {
          merchantPayerId: paymentData.payerId,
          fullName: paymentData.payerFullName,
          emailAddress: paymentData.payerEmail,
          contactPhone: paymentData.payerPhone || '5700000000',
          dniNumber: paymentData.payerDniNumber || '0000000000',
          billingAddress: {
            street1: paymentData.billingAddress?.street1 || 'N/A',
            street2: paymentData.billingAddress?.street2 || 'N/A',
            city: paymentData.billingAddress?.city || 'Bogota',
            state: paymentData.billingAddress?.state || 'Cundinamarca',
            country: paymentData.billingAddress?.country || 'CO',
            postalCode: paymentData.billingAddress?.postalCode || '000000',
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
    let isXml = false;
    
    // Try to parse as JSON first
    try {
      responseData = JSON.parse(responseText);
      console.log('[PayU] Successfully parsed response as JSON');
    } catch (jsonError) {
      // If JSON parsing fails, try XML
      console.log('[PayU] Response is not JSON, attempting XML parse');
      isXml = true;
      
      // Simple XML parser - extract key data
      try {
        const codeMatch = responseText.match(/<code>(\w+)<\/code>/);
        const transactionIdMatch = responseText.match(/<transactionId>([^<]+)<\/transactionId>/);
        const stateMatch = responseText.match(/<state>([^<]+)<\/state>/);
        const orderIdMatch = responseText.match(/<orderId>(\d+)<\/orderId>/);
        const errorMatch = responseText.match(/<error>([^<]+)<\/error>/);
        
        responseData = {
          code: codeMatch ? codeMatch[1] : 'ERROR',
          transactionResponse: {
            transactionId: transactionIdMatch ? transactionIdMatch[1] : null,
            state: stateMatch ? stateMatch[1] : null,
            orderId: orderIdMatch ? orderIdMatch[1] : null,
            responseMessage: errorMatch ? errorMatch[1] : 'Unknown error',
          },
          error: errorMatch ? errorMatch[1] : null,
        };
        
        console.log('[PayU] Successfully parsed XML response');
        console.log('[PayU] Parsed XML:', JSON.stringify(responseData, null, 2));
      } catch (xmlError) {
        console.error('[PayU] Failed to parse XML:', xmlError);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Failed to parse PayU response',
            raw: responseText.substring(0, 500),
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }
    }

    // Parse PayU response
    let result: any = {
      success: false,
      transactionState: null,
      transactionId: null,
      responseMessage: null,
    };

    // Check if response indicates success
    if (responseData.code === 'SUCCESS' && responseData.transactionResponse) {
      const txResp = responseData.transactionResponse;
      
      // Check if transaction state is APPROVED
      if (txResp.state === 'APPROVED' || txResp.state === 'AUTHORIZATION_AND_CAPTURE') {
        result.success = true;
        result.transactionState = 'APPROVED';
        result.transactionId = txResp.transactionId;
        result.orderId = txResp.orderId;
        result.responseMessage = 'Payment approved';
      } else {
        result.success = false;
        result.transactionState = txResp.state || 'UNKNOWN';
        result.responseMessage = txResp.responseMessage || 'Payment not approved';
      }
    } else {
      result.success = false;
      result.responseMessage = responseData.error || 'Payment failed';
      result.transactionState = 'FAILED';
    }

    console.log('[PayU] Final result:', result);

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
