import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Spinner } from '../components/ui/spinner';
import { CheckCircle, CreditCard, Shield } from 'lucide-react';
import { PAYU_CONFIG } from '../lib/payu';

export default function SubscriptionPayment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState(null);

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
      // TODO: Replace with real PayU flow once credentials are available
      const now = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const { error: dbError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          status: 'active',
          amount: PAYU_CONFIG.SUBSCRIPTION_AMOUNT,
          currency: PAYU_CONFIG.CURRENCY,
          payu_reference_code: `DEV_${user.id.substring(0, 8)}_${Date.now()}`,
          subscription_start_date: now.toISOString(),
          subscription_end_date: endDate.toISOString(),
        }, { onConflict: 'user_id' });

      if (dbError) throw new Error('Error al activar suscripción: ' + dbError.message);

      navigate('/dashboard');
    } catch (err) {
      console.error('Payment initialization error:', err);
      setError(err.message || 'Error al iniciar el pago');
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
                  Procesando...
                </>
              ) : (
                'Continuar al pago'
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
