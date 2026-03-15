import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Spinner } from '../components/ui/spinner';
import { CheckCircle, CreditCard, Shield, AlertCircle } from 'lucide-react';
import { PAYU_CONFIG, generateReferenceCode, createPaymentAPI } from '../lib/payu-api';
import PaymentResultModal from '../components/PaymentResultModal';

export default function SubscriptionPayment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardholderName: '',
    expiryDate: '',
    cvv: '',
  });
  const [addressData, setAddressData] = useState({
    dniNumber: '',
    phone: '',
    street1: '',
    street2: '',
    city: 'Bogota',
    state: 'Cundinamarca',
    country: 'CO',
    postalCode: '',
  });

  useEffect(() => {
    checkExistingSubscription();
  }, [user]);

  const checkExistingSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking subscription:', error);
        return;
      }

      if (data) {
        setSubscription(data);
        // If already has active subscription, redirect to dashboard
        if (data.status === 'active') {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleStartPayment = async () => {
    if (!user) {
      setError('Usuario no autenticado');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Validate card data
      if (!cardData.cardNumber || !cardData.cardholderName || !cardData.expiryDate || !cardData.cvv) {
        setError('Por favor completa todos los campos de la tarjeta.');
        setLoading(false);
        return;
      }

      // Validate address data
      if (!addressData.dniNumber || !addressData.phone || !addressData.street1 || !addressData.city || !addressData.postalCode) {
        setError('Por favor completa toda tu información de dirección.');
        setLoading(false);
        return;
      }

      const referenceCode = generateReferenceCode(user.id);

      // Create a pending subscription record
      const { error: dbError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          status: 'pending',
          amount: PAYU_CONFIG.SUBSCRIPTION_AMOUNT,
          currency: PAYU_CONFIG.CURRENCY,
          payu_reference_code: referenceCode,
        }, { onConflict: 'user_id' });

      if (dbError) {
        console.error('Error creating subscription record:', dbError);
        throw new Error('Error al crear el registro de suscripción');
      }

      // Process payment via API
      const paymentResult = await createPaymentAPI(user, cardData, referenceCode, addressData);
      
      console.log('[Payment] Result:', paymentResult);

      // If payment was successful (approved)
      if (paymentResult.success === true || paymentResult.transactionState === 'APPROVED' || paymentResult.transactionState === '4') {
        console.log('[Payment] Payment approved, updating subscription...');
        
        // Update subscription to active in database
        try {
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              payu_transaction_id: paymentResult.transactionId,
              payu_order_id: paymentResult.orderId,
              activated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);
          
          if (updateError) {
            console.error('[Payment] Error updating subscription:', updateError);
            throw updateError;
          }
          
          console.log('[Payment] Subscription activated successfully');
          
          // Show approval modal instead of redirecting immediately
          setPaymentResult({
            status: 'approved',
            message: 'Tu pago ha sido procesado exitosamente. Tu suscripción ya está activa.',
            transactionId: paymentResult.transactionId,
          });
          setLoading(false);
        } catch (dbError) {
          console.error('[Payment] Database error:', dbError);
          setPaymentResult({
            status: 'approved',
            message: 'Pago aprobado pero hubo un error actualizando tu suscripción. Contacta soporte.',
            transactionId: paymentResult.transactionId,
          });
          setLoading(false);
        }
        return;
      }

      // If response has a 3DS redirect URL, go there
      if (paymentResult.threeDomainSecurityUrl) {
        console.log('[Payment] Redirecting to 3DS:', paymentResult.threeDomainSecurityUrl);
        window.location.href = paymentResult.threeDomainSecurityUrl;
        return;
      }

      // If payment was declined or error
      if (paymentResult.transactionState === '6' || paymentResult.transactionState === '104' || paymentResult.success === false) {
        setPaymentResult({
          status: 'declined',
          message: paymentResult.responseMessage || 'Pago rechazado. Por favor intenta con otro método o tarjeta.',
          transactionId: paymentResult.transactionId,
        });
        setLoading(false);
        return;
      }

      // If payment is pending
      if (paymentResult.transactionState === '7') {
        setPaymentResult({
          status: 'pending',
          message: 'Tu pago está pendiente. Te notificaremos cuando se procese.',
          transactionId: paymentResult.transactionId,
        });
        setLoading(false);
        return;
      }

      // Default: payment processed, await webhook notification
      navigate('/dashboard', { state: { paymentProcessing: true } });
      
    } catch (err) {
      console.error('Payment initialization error:', err);
      setError(err.message || 'Error al procesar el pago. Por favor intenta nuevamente.');
      setLoading(false);
    }
  };

  const handlePaymentResultContinue = () => {
    if (paymentResult.status === 'approved') {
      navigate('/dashboard', { state: { paymentSuccess: true } });
    } else if (paymentResult.status === 'declined') {
      setPaymentResult(null);
      setCardData({
        cardNumber: '',
        cardholderName: '',
        expiryDate: '',
        cvv: '',
      });
    } else if (paymentResult.status === 'pending') {
      navigate('/dashboard', { state: { paymentProcessing: true } });
    }
  };

  const handlePaymentResultClose = () => {
    setPaymentResult(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Por favor inicia sesión para continuar</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <CreditCard className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Activa tu Suscripción</CardTitle>
          <CardDescription>
            Completa tu registro con una suscripción mensual para acceder a todas las funcionalidades
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Subscription Details */}
          <div className="bg-muted/50 rounded-lg p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b">
              <span className="text-lg font-medium">Suscripción Mensual</span>
              <div className="text-right">
                <p className="text-2xl font-bold">${PAYU_CONFIG.SUBSCRIPTION_AMOUNT.toLocaleString('es-CO')} COP</p>
                <p className="text-sm text-muted-foreground">≈ ${PAYU_CONFIG.SUBSCRIPTION_AMOUNT_USD} USD</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Acceso completo al sistema contable</p>
                  <p className="text-sm text-muted-foreground">Gestión de ingresos, gastos, activos y pasivos</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Reportes y análisis financieros</p>
                  <p className="text-sm text-muted-foreground">Genera reportes detallados de tu contabilidad</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Soporte técnico</p>
                  <p className="text-sm text-muted-foreground">Asistencia cuando lo necesites</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Actualizaciones automáticas</p>
                  <p className="text-sm text-muted-foreground">Nuevas funcionalidades incluidas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">Métodos de pago seguros</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Visa • Mastercard • American Express • PSE • Baloto • Efecty • y más
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Procesado de forma segura por PayU
            </p>
          </div>

          {/* Credit Card Form */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-semibold">Información de la Tarjeta de Crédito</h3>
            
            <div>
              <label className="text-sm font-medium block mb-2">Número de Tarjeta</label>
              <input
                type="text"
                placeholder="1234 5678 9012 3456"
                value={cardData.cardNumber}
                onChange={(e) => setCardData({ ...cardData, cardNumber: e.target.value.replace(/\s/g, '') })}
                className="w-full px-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                maxLength="16"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Nombre del Titular</label>
              <input
                type="text"
                placeholder="JUAN PEREZ"
                value={cardData.cardholderName}
                onChange={(e) => setCardData({ ...cardData, cardholderName: e.target.value })}
                className="w-full px-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-2">Vencimiento (MM/YY)</label>
                <input
                  type="text"
                  placeholder="06/28"
                  value={cardData.expiryDate}
                  onChange={(e) => setCardData({ ...cardData, expiryDate: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  maxLength="5"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">CVV</label>
                <input
                  type="text"
                  placeholder="123"
                  value={cardData.cvv}
                  onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  maxLength="4"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Para pruebas usa: 4111 1111 1111 1111 (cualquier fecha futura y CVV)
            </p>
          </div>

          {/* Billing and Shipping Information */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-semibold">Información de Facturación y Envío</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-2">Número de Identificación (DNI/CC)</label>
                <input
                  type="text"
                  placeholder="1234567890"
                  value={addressData.dniNumber}
                  onChange={(e) => setAddressData({ ...addressData, dniNumber: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Teléfono</label>
                <input
                  type="tel"
                  placeholder="5700000000"
                  value={addressData.phone}
                  onChange={(e) => setAddressData({ ...addressData, phone: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Dirección (Calle y Número)</label>
              <input
                type="text"
                placeholder="Cra 7 #45-32"
                value={addressData.street1}
                onChange={(e) => setAddressData({ ...addressData, street1: e.target.value })}
                className="w-full px-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Apartamento/Suite (Opcional)</label>
              <input
                type="text"
                placeholder="Apto 502"
                value={addressData.street2}
                onChange={(e) => setAddressData({ ...addressData, street2: e.target.value })}
                className="w-full px-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium block mb-2">Ciudad</label>
                <input
                  type="text"
                  placeholder="Bogota"
                  value={addressData.city}
                  onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Departamento</label>
                <input
                  type="text"
                  placeholder="Cundinamarca"
                  value={addressData.state}
                  onChange={(e) => setAddressData({ ...addressData, state: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Código Postal</label>
                <input
                  type="text"
                  placeholder="110121"
                  value={addressData.postalCode}
                  onChange={(e) => setAddressData({ ...addressData, postalCode: e.target.value })}
                  className="w-full px-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleStartPayment} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Procesando pago...
                </>
              ) : (
                `Pagar $${PAYU_CONFIG.SUBSCRIPTION_AMOUNT.toLocaleString('es-CO')} COP`
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Al continuar, aceptas nuestros términos y condiciones. 
            La suscripción se renovará automáticamente cada mes.
          </p>
        </CardContent>
      </Card>

      {/* Payment Result Modal */}
      <PaymentResultModal 
        isOpen={!!paymentResult}
        status={paymentResult?.status}
        message={paymentResult?.message}
        transactionId={paymentResult?.transactionId}
        onContinue={handlePaymentResultContinue}
        onClose={handlePaymentResultClose}
      />
    </div>
  );
}
