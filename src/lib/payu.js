// PayU Latam Integration for Colombia
// Using WebCheckout Form Integration
// Documentation: https://developers.payulatam.com/latam/es/docs/integrations/webcheckout-integration.html

import CryptoJS from 'crypto-js';
import { supabase } from './supabase';

// MD5 implementation using crypto-js
const md5 = (string) => {
  return CryptoJS.MD5(string).toString();
};

// Cache for configuration
let configCache = null;
let configCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get dynamic configuration from Supabase
 */
export const getConfig = async () => {
  const now = Date.now();
  
  // Return cached config if still valid
  if (configCache && (now - configCacheTime) < CACHE_DURATION) {
    return configCache;
  }

  try {
    const { data, error } = await supabase
      .from('config')
      .select('key, value')
      .in('key', ['response_url', 'confirmation_url']);
    
    if (error) throw error;
    
    // Build config object from database
    const dynamicConfig = {
      response_url: 'https://newchat-j973tyhqdvhcmzbgqf2g5q.vercel.app/payment/response',
      confirmation_url: 'https://zijpwpflpuqyuwqnsrme.supabase.co/functions/v1/payu-confirmation'
    };
    
    if (data) {
      data.forEach(row => {
        dynamicConfig[row.key] = row.value;
      });
    }
    
    // Cache the config
    configCache = dynamicConfig;
    configCacheTime = now;
    
    return dynamicConfig;
  } catch (err) {
    console.warn('[PayU] Could not load config from Supabase, using defaults:', err);
    // Return defaults if query fails
    return {
      response_url: 'https://newchat-j973tyhqdvhcmzbgqf2g5q.vercel.app/payment/response',
      confirmation_url: 'https://zijpwpflpuqyuwqnsrme.supabase.co/functions/v1/payu-confirmation'
    };
  }
};

// PayU Configuration
export const PAYU_CONFIG = {
  MERCHANT_ID: import.meta.env.VITE_PAYU_MERCHANT_ID || '1020873',
  API_KEY: import.meta.env.VITE_PAYU_API_KEY || '3L7LJ956SmM3Lz1f6lZMWtzsx9',
  ACCOUNT_ID: import.meta.env.VITE_PAYU_ACCOUNT_ID || '1029937', // Colombia account
  
  // WebCheckout URL
  PAYMENT_URL: 'https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/',
  
  // Response URLs - will be loaded dynamically
  RESPONSE_URL: 'https://newchat-j973tyhqdvhcmzbgqf2g5q.vercel.app/payment/response',
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
 * IMPORTANTE: El amount en la firma NO debe tener decimales
 * According to PayU docs: https://developers.payulatam.com/latam/es/docs/integrations/webcheckout-integration/payment-form.html
 */
export const generateSignature = (referenceCode, amount) => {
  // Remove decimals from amount for signature calculation
  const amountForSignature = String(amount).split('.')[0];
  
  const signatureString = `${PAYU_CONFIG.API_KEY}~${PAYU_CONFIG.MERCHANT_ID}~${referenceCode}~${amountForSignature}~${PAYU_CONFIG.CURRENCY}`;
  
  console.log('[PayU] === SIGNATURE CALCULATION ===');
  console.log('[PayU] API Key:', PAYU_CONFIG.API_KEY);
  console.log('[PayU] Merchant ID:', PAYU_CONFIG.MERCHANT_ID);
  console.log('[PayU] Reference Code:', referenceCode);
  console.log('[PayU] Amount (without decimals for signature):', amountForSignature);
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
export const createPaymentFormData = async (user, referenceCode) => {
  // Get dynamic configuration
  const dynamicConfig = await getConfig();
  
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
    responseUrl: dynamicConfig.response_url,
    confirmationUrl: dynamicConfig.confirmation_url,
  });
  
  return {
    // Parámetros obligatorios según PayU docs
    merchantId: PAYU_CONFIG.MERCHANT_ID,
    accountId: PAYU_CONFIG.ACCOUNT_ID,
    description: 'Suscripción Mensual - Sistema Contable',
    referenceCode: referenceCode,
    amount: amount,
    tax: '0',
    taxReturnBase: '0',
    currency: PAYU_CONFIG.CURRENCY,
    signature: signature,
    language: PAYU_CONFIG.LANGUAGE,
    test: 1,
    
    // Información del comprador
    buyerFullName: user.email.split('@')[0], // Usa parte del email como nombre
    buyerEmail: user.email,
    buyerPhone: '0000000000', // Requerido por PayU
    
    // URLs
    responseUrl: dynamicConfig.response_url,
    confirmationUrl: dynamicConfig.confirmation_url,
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
  console.log('[PayU] All form fields being sent:');
  console.log(formData);
  
  Object.keys(formData).forEach(key => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = formData[key];
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
