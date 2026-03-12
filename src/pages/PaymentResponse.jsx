import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Spinner } from '../components/ui/spinner';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { verifyResponseSignature, getTransactionStatusMessage } from '../lib/payu';

export default function PaymentResponse() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentResult, setPaymentResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    processPaymentResponse();
  }, [searchParams]);

  const processPaymentResponse = async () => {
    try {
      // Get PayU response parameters
      const transactionState = searchParams.get('transactionState');
      const referenceCode = searchParams.get('referenceCode');
      const txValue = searchParams.get('TX_VALUE');
      const currency = searchParams.get('currency');
      const signature = searchParams.get('signature');
      const transactionId = searchParams.get('transactionId');
      const orderId = searchParams.get('orderId');
      const paymentMethod = searchParams.get('lapPaymentMethod');

      if (!transactionState || !referenceCode) {
        setError('Respuesta de pago inválida');
        setLoading(false);
        return;
      }

      // Verify signature
      const isValidSignature = verifyResponseSignature({
        referenceCode,
        TX_VALUE: txValue,
        currency,
        transactionState,
        signature
      });

      if (!isValidSignature) {
        setError('Firma de transacción inválida');
        setLoading(false);
        return;
      }

      // Get transaction status message
      const statusInfo = getTransactionStatusMessage(transactionState);
      setPaymentResult({
        ...statusInfo,
        transactionId,
        orderId,
        referenceCode,
        amount: txValue,
        currency,
        paymentMethod
      });

      // Update subscription in database
      if (user) {
        await updateSubscriptionStatus(
          user.id,
          transactionState,
          transactionId,
          orderId,
          referenceCode,
          paymentMethod
        );
      }

      setLoading(false);
    } catch (err) {
      console.error('Error processing payment response:', err);
      setError('Error al procesar la respuesta del pago');
      setLoading(false);
    }
  };

  const updateSubscriptionStatus = async (
    userId,
    transactionState,
    transactionId,
    orderId,
    referenceCode,
    paymentMethod
  ) => {
    try {
      let status = 'pending';
      let subscriptionStartDate = null;
      let subscriptionEndDate = null;

      // Map PayU transaction state to our subscription status
      if (transactionState === '4') {
        // Approved
        status = 'active';
        subscriptionStartDate = new Date();
        subscriptionEndDate = new Date();
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
      } else if (transactionState === '6' || transactionState === '104') {
        // Declined or Error
        status = 'cancelled';
      } else if (transactionState === '7') {
        // Pending
        status = 'pending';
      } else if (transactionState === '5') {
        // Expired
        status = 'expired';
      }

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status,
          payu_transaction_id: transactionId,
          payu_order_id: orderId,
          payment_method: paymentMethod,
          subscription_start_date: subscriptionStartDate,
          subscription_end_date: subscriptionEndDate,
          updated_at: new Date(),
        })
        .eq('user_id', userId)
        .eq('payu_reference_code', referenceCode);

      if (error) {
        console.error('Error updating subscription:', error);
      }
    } catch (err) {
      console.error('Error in updateSubscriptionStatus:', err);
    }
  };

  const getIcon = () => {
    if (!paymentResult) return null;

    switch (paymentResult.status) {
      case 'approved':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'declined':
      case 'error':
        return <XCircle className="w-16 h-16 text-red-500" />;
      case 'pending':
        return <Clock className="w-16 h-16 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-16 h-16 text-orange-500" />;
    }
  };

  const handleContinue = () => {
    if (paymentResult?.status === 'approved') {
      navigate('/dashboard');
    } else {
      navigate('/subscription-payment');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Spinner className="h-12 w-12" />
            <p className="text-center text-muted-foreground">Procesando resultado del pago...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => navigate('/subscription-payment')} className="w-full">
              Volver a intentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {getIcon()}
          </div>
          <CardTitle className="text-2xl">
            {paymentResult?.status === 'approved' && '¡Pago Exitoso!'}
            {paymentResult?.status === 'declined' && 'Pago Rechazado'}
            {paymentResult?.status === 'error' && 'Error en el Pago'}
            {paymentResult?.status === 'pending' && 'Pago Pendiente'}
            {!['approved', 'declined', 'error', 'pending'].includes(paymentResult?.status) && 'Estado Desconocido'}
          </CardTitle>
          <CardDescription>
            {paymentResult?.message}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Transaction Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Referencia:</span>
              <span className="font-mono">{paymentResult?.referenceCode}</span>
            </div>
            
            {paymentResult?.transactionId && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ID Transacción:</span>
                <span className="font-mono">{paymentResult?.transactionId}</span>
              </div>
            )}
            
            {paymentResult?.amount && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monto:</span>
                <span className="font-semibold">
                  ${parseFloat(paymentResult.amount).toLocaleString('es-CO')} {paymentResult.currency}
                </span>
              </div>
            )}
            
            {paymentResult?.paymentMethod && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Método de pago:</span>
                <span>{paymentResult.paymentMethod}</span>
              </div>
            )}
          </div>

          {/* Success message */}
          {paymentResult?.status === 'approved' && (
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                Tu suscripción está activa. Ahora puedes acceder a todas las funcionalidades del sistema.
              </AlertDescription>
            </Alert>
          )}

          {/* Pending message */}
          {paymentResult?.status === 'pending' && (
            <Alert className="bg-yellow-500/10 border-yellow-500/20">
              <Clock className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                Te notificaremos por email cuando el pago sea confirmado.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Button */}
          <Button onClick={handleContinue} className="w-full" size="lg">
            {paymentResult?.status === 'approved' ? 'Ir al Dashboard' : 'Volver a intentar'}
          </Button>

          {paymentResult?.status !== 'approved' && (
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
              Continuar sin suscripción
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
