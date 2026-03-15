// PayU Latam Integration for Colombia
// Using REST API with 3DS Authentication
// Documentation: https://developers.payulatam.com/latam/es/docs/integrations/api-integration.html

// PayU Configuration
export const PAYU_CONFIG = {
  MERCHANT_ID: import.meta.env.VITE_PAYU_MERCHANT_ID || '1020873',
  API_LOGIN: 'riaRvCyc30FBfP6', // API LOGIN from dashboard
  API_KEY: import.meta.env.VITE_PAYU_API_KEY || '3L7LJ956SmM3Lz1f6lZMWtzsx9',
  ACCOUNT_ID: import.meta.env.VITE_PAYU_ACCOUNT_ID || '1029937', // Colombia account
  
  // Currency and language
  CURRENCY: 'COP',
  LANGUAGE: 'es',
  
  // Subscription amount (15,000 COP per month)
  SUBSCRIPTION_AMOUNT: 15000,
  SUBSCRIPTION_AMOUNT_USD: 3.75,
};

/**
 * Generate a unique reference code for the transaction
 */
export const generateReferenceCode = (userId) => {
  const timestamp = Date.now();
  return `SUB_${userId.substring(0, 8)}_${timestamp}`;
};

/**
 * Create PayU payment request via API
 * Sends directly to Supabase Edge Function (bypass auth)
 */
export const createPaymentAPI = async (user, cardData, referenceCode) => {
  try {
    console.log('[PayU] Creating payment request via API...');
    
    // Validate card data
    if (!cardData.cardNumber || !cardData.cardholderName || !cardData.expiryDate || !cardData.cvv) {
      throw new Error('Datos de tarjeta incompletos');
    }
    
    // Call Edge Function directly via fetch (no Supabase auth required)
    const functionUrl = 'https://zijpwpflpuqyuwqnsrme.supabase.co/functions/v1/payu-payment';
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merchantId: PAYU_CONFIG.MERCHANT_ID,
        apiLogin: PAYU_CONFIG.API_LOGIN,
        apiKey: PAYU_CONFIG.API_KEY,
        accountId: PAYU_CONFIG.ACCOUNT_ID,
        
        // Order info
        description: 'Suscripción Mensual - Sistema Contable',
        referenceCode: referenceCode,
        amount: PAYU_CONFIG.SUBSCRIPTION_AMOUNT,
        currency: PAYU_CONFIG.CURRENCY,
        language: PAYU_CONFIG.LANGUAGE,
        
        // Payer info
        payerFullName: cardData.cardholderName,
        payerEmail: user.email,
        payerPhone: '0000000000',
        payerId: user.id,
        
        // Card info
        creditCardNumber: cardData.cardNumber.replace(/\s/g, ''),
        creditCardSecurityCode: cardData.cvv,
        creditCardExpiryDate: cardData.expiryDate,
        creditCardName: cardData.cardholderName,
        
        // Response URLs
        responseUrl: `${window.location.origin}/payment/response`,
        confirmationUrl: 'https://zijpwpflpuqyuwqnsrme.supabase.co/functions/v1/payu-confirmation',
      })
    });

    console.log('[PayU] API Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Edge Function returned HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('[PayU] API Response data:', data);
    
    return data;
  } catch (error) {
    console.error('[PayU] API Error:', error);
    throw error;
  }
};

/**
 * Get transaction status message
 */
export const getTransactionStatusMessage = (state) => {
  const messages = {
    '4': { status: 'approved', message: '¡Pago aprobado! Tu suscripción está activa.' },
    '6': { status: 'declined', message: 'Pago rechazado. Por favor intenta con otro método.' },
    '104': { status: 'error', message: 'Error en la transacción.' },
    '7': { status: 'pending', message: 'Transacción pendiente.' },
    '5': { status: 'expired', message: 'Transacción expirada.' },
  };
  
  return messages[state] || { status: 'unknown', message: 'Estado desconocido.' };
};
