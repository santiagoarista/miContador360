// PayU Latam Integration for Colombia
// Documentation: https://developers.payulatam.com/latam/en/docs/integrations/webcheckout-integration.html

// Simple MD5 implementation for PayU signatures
const md5 = (string) => {
  const utf8 = unescape(encodeURIComponent(string));
  let hash = 0;
  
  // For production, use a proper MD5 implementation
  // This is a simplified version - consider using crypto-js or similar
  const crypto = window.crypto || window.msCrypto;
  if (crypto && crypto.subtle) {
    // Use Web Crypto API if available (but it doesn't support MD5)
    // So we'll use a simple implementation
  }
  
  // Simple MD5 hash function
  function md5cycle(x, k) {
    let a = x[0], b = x[1], c = x[2], d = x[3];
    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17, 606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12, 1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7, 1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7, 1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22, 1236535329);
    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14, 643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9, 38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5, 568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20, 1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14, 1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);
    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16, 1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11, 1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4, 681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23, 76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16, 530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);
    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10, 1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6, 1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6, 1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21, 1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15, 718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);
    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }

  function cmn(q, a, b, x, s, t) {
    a = add32(add32(a, q), add32(x, t));
    return add32((a << s) | (a >>> (32 - s)), b);
  }

  function ff(a, b, c, d, x, s, t) {
    return cmn((b & c) | ((~b) & d), a, b, x, s, t);
  }

  function gg(a, b, c, d, x, s, t) {
    return cmn((b & d) | (c & (~d)), a, b, x, s, t);
  }

  function hh(a, b, c, d, x, s, t) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function ii(a, b, c, d, x, s, t) {
    return cmn(c ^ (b | (~d)), a, b, x, s, t);
  }

  function add32(a, b) {
    return (a + b) & 0xFFFFFFFF;
  }

  function md51(s) {
    const n = s.length;
    const state = [1732584193, -271733879, -1732584194, 271733878];
    let i;
    for (i = 64; i <= s.length; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)));
    }
    s = s.substring(i - 64);
    const tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (i = 0; i < s.length; i++)
      tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) {
      md5cycle(state, tail);
      for (i = 0; i < 16; i++) tail[i] = 0;
    }
    tail[14] = n * 8;
    md5cycle(state, tail);
    return state;
  }

  function md5blk(s) {
    const md5blks = [];
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
  }

  const hex_chr = '0123456789abcdef'.split('');

  function rhex(n) {
    let s = '';
    for (let j = 0; j < 4; j++)
      s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
    return s;
  }

  function hex(x) {
    for (let i = 0; i < x.length; i++)
      x[i] = rhex(x[i]);
    return x.join('');
  }

  return hex(md51(utf8));
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
  
  // Subscription amount (10 USD in COP - approximately 40,000 COP)
  SUBSCRIPTION_AMOUNT: 40000, // Update this based on current exchange rate
  SUBSCRIPTION_AMOUNT_USD: 10,
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
