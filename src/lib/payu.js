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
  MERCHANT_ID: import.meta.env.VITE_PAYU_MERCHANT_ID || '1020873',
  API_KEY: import.meta.env.VITE_PAYU_API_KEY || '3L7LJ956SmM3Lz1f6lZMWtzsx9',
  ACCOUNT_ID: import.meta.env.VITE_PAYU_ACCOUNT_ID || '1029937', // Colombia account
  
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
 * According to PayU docs: https://developers.payulatam.com/latam/es/docs/integrations/webcheckout-integration/payment-form.html
 */
export const generateSignature = (referenceCode, amount) => {
  // Ensure amount is a string with explicit decimals
  const amountStr = String(amount);
  
  const signatureString = `${PAYU_CONFIG.API_KEY}~${PAYU_CONFIG.MERCHANT_ID}~${referenceCode}~${amountStr}~${PAYU_CONFIG.CURRENCY}`;
  
  console.log('[PayU] === SIGNATURE CALCULATION ===');
  console.log('[PayU] API Key:', PAYU_CONFIG.API_KEY);
  console.log('[PayU] Merchant ID:', PAYU_CONFIG.MERCHANT_ID);
  console.log('[PayU] Reference Code:', referenceCode);
  console.log('[PayU] Amount:', amountStr);
  console.log('[PayU] Currency:', PAYU_CONFIG.CURRENCY);
  console.log('[PayU] Raw string to hash:', signatureString);
  
  const signature = md5(signatureString);
  
  console.log('[PayU] MD5 Hash result:', signature);
  console.log('[PayU] === END SIGNATURE CALCULATION ===');
  
  return signature;
};

/**
 * Create PayU payment form data for WebCheckout
 */
export const createPaymentFormData = (user, referenceCode) => {
  // Amount MUST be a string with two decimal places for PayU signature
  const amount = String(PAYU_CONFIG.SUBSCRIPTION_AMOUNT) + '.00';
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
  
  console.log('[PayU] === SUBMITTING FORM ===');
  console.log('[PayU] Target URL:', PAYU_CONFIG.PAYMENT_URL);
  console.log('[PayU] Form fields being sent:');
  
  Object.keys(formData).forEach(key => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = formData[key];
    
    // Log each field
    if (key === 'signature' || key === 'merchantId' || key === 'accountId' || key === 'referenceCode' || key === 'amount' || key === 'currency') {
      console.log(`  ${key}: ${formData[key]}`);
    }
    
    form.appendChild(input);
  });
  
  console.log('[PayU] === END FORM DATA ===');
  
  document.body.appendChild(form);
  console.log('[PayU] Submitting form to PayU...');
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
