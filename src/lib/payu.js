// PayU Latam Integration for Colombia
// Using WebCheckout Form Integration
// Documentation: https://developers.payulatam.com/latam/es/docs/integrations/webcheckout-integration.html

import CryptoJS from 'crypto-js';

// MD5 implementation using crypto-js
const md5 = (string) => {
  return CryptoJS.MD5(string).toString();
};

// PayU Configuration
export const PAYU_CONFIG = {
  MERCHANT_ID: import.meta.env.VITE_PAYU_MERCHANT_ID || '508029',
  API_KEY: import.meta.env.VITE_PAYU_API_KEY || '4Vj8eK4rloUd272L48hsrarnUA',
  ACCOUNT_ID: import.meta.env.VITE_PAYU_ACCOUNT_ID || '512321', // Colombia account
  
  // WebCheckout URL
  PAYMENT_URL: 'https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/',
  
  // Response URLs
  RESPONSE_URL: `${typeof window !== 'undefined' ? window.location.origin : ''}/payment/response`,
  CONFIRMATION_URL: 'https://zijpwpflpuqyuwqnsrme.supabase.co/functions/v1/payu-confirmation',
  
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
 * Generate MD5 signature for PayU payment
 * Format: ApiKey~merchantId~referenceCode~amount~currency
 */
export const generateSignature = (referenceCode, amount) => {
  const signatureString = `${PAYU_CONFIG.API_KEY}~${PAYU_CONFIG.MERCHANT_ID}~${referenceCode}~${amount}~${PAYU_CONFIG.CURRENCY}`;
  console.log('[PayU] Generating signature for:', {
    apiKey: PAYU_CONFIG.API_KEY.substring(0, 10) + '...',
    merchantId: PAYU_CONFIG.MERCHANT_ID,
    referenceCode,
    amount,
    currency: PAYU_CONFIG.CURRENCY,
  });
  console.log('[PayU] Signature string:', signatureString);
  const signature = md5(signatureString);
  console.log('[PayU] Generated signature:', signature);
  return signature;
};

/**
 * Create PayU payment form data for WebCheckout
 */
export const createPaymentFormData = (user, referenceCode) => {
  const amount = PAYU_CONFIG.SUBSCRIPTION_AMOUNT;
  const signature = generateSignature(referenceCode, amount);
  
  console.log('[PayU] Payment form data to submit:', {
    merchantId: PAYU_CONFIG.MERCHANT_ID,
    accountId: PAYU_CONFIG.ACCOUNT_ID,
    referenceCode,
    amount,
    signature,
    buyerEmail: user.email,
  });
  
  return {
    merchantId: PAYU_CONFIG.MERCHANT_ID,
    accountId: PAYU_CONFIG.ACCOUNT_ID,
    description: 'Suscripción Mensual - Sistema Contable',
    referenceCode: referenceCode,
    amount: amount,
    tax: 0,
    taxReturnBase: 0,
    currency: PAYU_CONFIG.CURRENCY,
    signature: signature,
    test: 1, // Always test mode in sandbox
    buyerEmail: user.email,
    responseUrl: PAYU_CONFIG.RESPONSE_URL,
    confirmationUrl: PAYU_CONFIG.CONFIRMATION_URL,
    paymentMethods: 'MASTERCARD,VISA,AMEX,PSE',
    extra1: user.id,
    extra2: 'monthly_subscription',
  };
};

/**
 * Submit payment form to PayU
 */
export const submitPaymentForm = (formData) => {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = PAYU_CONFIG.PAYMENT_URL;
  form.style.display = 'none';
  
  Object.keys(formData).forEach(key => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = formData[key];
    console.log(`[PayU] Form field: ${key} = ${formData[key]}`);
    form.appendChild(input);
  });
  
  console.log('[PayU] Submitting form to:', PAYU_CONFIG.PAYMENT_URL);
  document.body.appendChild(form);
  form.submit();
};

/**
 * Verify PayU response signature
 */
export const verifyResponseSignature = (data) => {
  const { referenceCode, TX_VALUE, currency, transactionState, signature } = data;
  const amount = parseFloat(TX_VALUE).toFixed(1);
  
  const signatureString = `${PAYU_CONFIG.API_KEY}~${PAYU_CONFIG.MERCHANT_ID}~${referenceCode}~${amount}~${currency}~${transactionState}`;
  const calculatedSignature = md5(signatureString);
  
  console.log('[PayU] Verifying response signature:', {
    received: signature,
    calculated: calculatedSignature,
    match: signature === calculatedSignature,
  });
  
  return calculatedSignature === signature;
};

/**
 * Get transaction status message
 */
export const getTransactionStatusMessage = (state) => {
  const messages = {
    '4': { status: 'approved', message: '¡Pago aprobado! Tu suscripción está activa.' },
    '6': { status: 'declined', message: 'Pago rechazado.' },
    '104': { status: 'error', message: 'Error en la transacción.' },
    '7': { status: 'pending', message: 'Transacción pendiente.' },
    '5': { status: 'expired', message: 'Transacción expirada.' },
  };
  
  return messages[state] || { status: 'unknown', message: 'Estado desconocido.' };
};
