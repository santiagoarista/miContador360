# Guía de Configuración PayU y Suscripción - Actualización

## ✅ Cambios Realizados

### 1. Configuración de PayU en `.env`
Se han agregado las credenciales de **modo sandbox (prueba)** de PayU:
```env
VITE_PAYU_MERCHANT_ID=508029
VITE_PAYU_API_KEY=4Vj8eK4rloUd272L48hsrarnUA
VITE_PAYU_ACCOUNT_ID=512321
VITE_PAYU_TEST_MODE=true
VITE_PAYU_PAYMENT_URL=https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/
VITE_PAYU_API_URL=https://sandbox.api.payulatam.com/payments-api/4.0/service.cgi
```

### 2. Cambio del Precio de Suscripción
- **Antes:** $40.000 COP
- **Ahora:** $15.000 COP por mes
- **Ubicación:** `src/lib/payu.js` - `SUBSCRIPTION_AMOUNT`

### 3. Implementación Real de PayU
**Archivo:** `src/pages/SubscriptionPayment.jsx`
- Cambio de simulación a integración real
- El botón ahora envía formulario directamente a PayU
- Se crea un registro "pendiente" en la BD antes de redirigir a PayU

### 4. Nueva Página "Mi Perfil"
**Archivo:** `src/pages/Profile.jsx`
- Muestra: Email del usuario, estado de suscripción, monto, fechas
- Opciones:
  - Ver código de referencia de PayU
  - Cancelar suscripción (con confirmación)
  - Ver fecha de cancelación si aplica

### 5. Integración en Dashboard
- Nueva ruta: `/profile`
- Nuevo botón en sidebar: "Mi Perfil"
- Ubicado entre "Tipo Contribuyente" y "Cerrar Sesión"

## 🧪 Instrucciones para Probar

### Flujo de Registro y Pago:

1. **Ir a Login:** `http://localhost:5173/login`

2. **Registrar nueva cuenta:**
   - Email: `test@example.com`
   - Contraseña: (tu contraseña)
   - Nombre: (tu nombre)
   - Click: "Crear Cuenta"

3. **Serás redirigido a Suscripción:**
   - Verás la página con el precio de $15.000 COP
   - Click: "Continuar al pago"

4. **Serás redirigido a PayU Sandbox:**
   - Aparecerá el checkout de PayU en modo prueba
   - Usa una tarjeta de prueba de PayU

### Tarjetas de Prueba para PayU (Sandbox):

**Visa - Transacción Aprobada:**
```
Número: 4111111111111111
Vencimiento: 01/25
CVV: 123
```

**Mastercard - Transacción Rechazada:**
```
Número: 5425233010103244
Vencimiento: 01/25
CVV: 123
```

### Después del Pago:

1. **Si pago exitoso:**
   - PayU te redirige a `/payment/response`
   - Verás confirmación de pago aprobado
   - Se actualiza suscripción a "activa"
   - Podrás acceder al dashboard

2. **Si quieres ver tu perfil:**
   - Ve a `http://localhost:5173/profile`
   - O usa el botón "Mi Perfil" en el sidebar
   - Verás todos los detalles de tu suscripción

3. **Para cancelar suscripción:**
   - En la página de perfil, click "Cancelar Suscripción"
   - Confirma la acción
   - Status cambia a "cancelada"

## 🔄 Flujo de Autenticación

```
NUEVO USUARIO:
Login → Registro → /subscription-payment → PayU → /payment/response → Dashboard

USUARIO EXISTENTE SIN PAGO:
Login → /subscription-payment → PayU → /payment/response → Dashboard

USUARIO CON SUSCRIPCIÓN ACTIVA:
Login → /dashboard (directo)
```

## 📝 Base de Datos

**Tabla: `subscriptions`**
```
- user_id (FK)
- status: 'active', 'pending', 'canceled', 'expired'
- amount: valor en COP
- currency: 'COP'
- payu_reference_code: código único de transacción
- payu_transaction_id: ID de PayU
- payu_order_id: Orden de PayU
- payment_method: método de pago usado
- subscription_start_date
- subscription_end_date
- canceled_at: cuando fue cancelada
```

## 🔐 Seguridad

- Firmas MD5 verificadas en ambas direcciones (request/response)
- Credenciales en `.env` (nunca en código)
- Respuestas de PayU validadas antes de actualizar BD
- Modo sandbox confirmado en PAYU_TEST_MODE=true

## 🚀 Próximos Pasos (Producción)

Cuando estés listo para ir a producción:

1. **Obtener credenciales reales:**
   - [PayU Merchants Console](https://merchants.payulatam.com/)
   - Solicitar acceso a producción

2. **Actualizar `.env`:**
   ```env
   VITE_PAYU_TEST_MODE=false
   VITE_PAYU_PAYMENT_URL=https://checkout.payulatam.com/ppp-web-gateway-payu/
   VITE_PAYU_API_URL=https://api.payulatam.com/payments-api/4.0/service.cgi
   VITE_PAYU_MERCHANT_ID=tu_merchant_id_real
   VITE_PAYU_API_KEY=tu_api_key_real
   VITE_PAYU_ACCOUNT_ID=tu_account_id_real
   ```

3. **Configurar Webhooks:**
   - En PayU console → Configuración webhooks
   - URL de confirmación: `https://tudominio.com/functions/v1/payu-confirmation`

4. **Actualizar dominio CORS:**
   - En PayU → Dominios autorizados
   - Agregar tu dominio de producción

## 📞 Soporte

Para problemas con PayU:
- [Documentación Oficial](https://developers.payulatam.com/latam/es/docs/)
- [Códigos de Error PayU](https://developers.payulatam.com/latam/es/docs/integrations/webcheckout-integration/response-codes.html)
