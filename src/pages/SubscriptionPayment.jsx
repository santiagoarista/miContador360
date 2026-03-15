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

export default function SubscriptionPayment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [cardData, setCardData] = useState({
    cardNumber: '',
    cardholderName: '',
    expiryDate: '',
    cvv: '',
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
      const paymentResult = await createPaymentAPI(user, cardData, referenceCode);
      
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
          navigate('/dashboard', { state: { paymentSuccess: true } });
        } catch (dbError) {
          console.error('[Payment] Database error:', dbError);
          setError('Pago aprobado pero hubo un error actualizando tu suscripción. Contacta soporte.');
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
        setError(paymentResult.responseMessage || 'Pago rechazado. Por favor intenta con otro método o tarjeta.');
        setLoading(false);
        return;
      }

      // If payment is pending
      if (paymentResult.transactionState === '7') {
        setError('Tu pago está pendiente. Te notificaremos cuando se procese.');
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
    </div>
  );
}
