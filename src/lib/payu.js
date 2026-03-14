// PayU Latam Integration for Colombia
// Documentation: https://developers.payulatam.com/latam/en/docs/integrations/webcheckout-integration.html

import CryptoJS from 'crypto-js';

// MD5 implementation using crypto-js
const md5 = (string) => {
  return CryptoJS.MD5(string).toString();
};

// PayU Configuration
export const PAYU_CONFIG = {
  // Test credentials - Replace with production credentials before going live
  MERCHANT_ID: import.meta.env.VITE_PAYU_MERCHANT_ID || '508029',
  API_KEY: import.meta.env.VITE_PAYU_API_KEY || '4Vj8eK4rloUd272L48hsrarnUA',
  ACCOUNT_ID: import.meta.env.VITE_PAYU_ACCOUNT_ID || '512321', // Colombia account
  
  // URLs
  PAYMENT_URL: import.meta.env.VITE_PAYU_PAYMENT_URL || 'https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/',
  API_URL: import.meta.env.VITE_PAYU_API_URL || 'https://sandbox.api.payulatam.com/payments-api/4.0/service.cgi',
  
  // Response URLs
  RESPONSE_URL: `${window.location.origin}/payment/response`,
  CONFIRMATION_URL: import.meta.env.VITE_PAYU_CONFIRMATION_URL || 
    'https://zijpwpflpuqyuwqnsrme.supabase.co/functions/v1/payu-confirmation',
  
  // Currency and language
  CURRENCY: 'COP',
  LANGUAGE: 'es',
  
  // Subscription amount (15,000 COP per month)
  SUBSCRIPTION_AMOUNT: 15000,
  SUBSCRIPTION_AMOUNT_USD: 3.75,
};

/**
 * Generate MD5 signature for PayU payment
 * Format: ApiKey~merchantId~referenceCode~amount~currency
 */
export const generateSignature = (referenceCode, amount, currency = PAYU_CONFIG.CURRENCY) => {
  const signatureString = `${PAYU_CONFIG.API_KEY}~${PAYU_CONFIG.MERCHANT_ID}~${referenceCode}~${amount}~${currency}`;
  return md5(signatureString);
};

/**
 * Generate a unique reference code for the transaction
 */
export const generateReferenceCode = (userId) => {
  const timestamp = Date.now();
  return `SUB_${userId.substring(0, 8)}_${timestamp}`;
};

/**
 * Create PayU payment form data
 */
export const createPaymentFormData = (user, referenceCode) => {
  const amount = PAYU_CONFIG.SUBSCRIPTION_AMOUNT;
  const signature = generateSignature(referenceCode, amount);
  
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
    test: import.meta.env.VITE_PAYU_TEST_MODE !== 'false' ? '1' : '0',
    buyerEmail: user.email,
    responseUrl: PAYU_CONFIG.RESPONSE_URL,
    confirmationUrl: PAYU_CONFIG.CONFIRMATION_URL,
    paymentMethods: 'MASTERCARD,VISA,AMEX,PSE,BALOTO,EFECTY,BANK_REFERENCED,OTHERS_CASH',
    extra1: user.id, // Store user ID for reference
    extra2: 'monthly_subscription',
  };
};

/**
 * Verify PayU response signature
 * Format for response: ApiKey~merchantId~referenceCode~amount~currency~transactionState
 */
export const verifyResponseSignature = (data) => {
  const { referenceCode, TX_VALUE, currency, transactionState, signature } = data;
  
  // Round to 1 decimal for signature verification
  const amount = parseFloat(TX_VALUE).toFixed(1);
  
  const signatureString = `${PAYU_CONFIG.API_KEY}~${PAYU_CONFIG.MERCHANT_ID}~${referenceCode}~${amount}~${currency}~${transactionState}`;
  const calculatedSignature = md5(signatureString);
  
  return calculatedSignature === signature;
};

/**
 * Get transaction status message
 */
export const getTransactionStatusMessage = (state) => {
  const messages = {
    '4': { status: 'approved', message: '¡Pago aprobado! Tu suscripción está activa.' },
    '6': { status: 'declined', message: 'Pago rechazado. Por favor intenta con otro método de pago.' },
    '104': { status: 'error', message: 'Error en el pago. Por favor contacta a soporte.' },
    '7': { status: 'pending', message: 'Pago pendiente de confirmación. Te notificaremos cuando se complete.' },
    '5': { status: 'expired', message: 'Transacción expirada. Por favor intenta nuevamente.' },
  };
  
  return messages[state] || { status: 'unknown', message: 'Estado de transacción desconocido.' };
};

/**
 * Submit payment form programmatically
 */
export const submitPayUForm = (formData) => {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = PAYU_CONFIG.PAYMENT_URL;
  
  Object.keys(formData).forEach(key => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = formData[key];
    form.appendChild(input);
  });
  
  document.body.appendChild(form);
  form.submit();
};
