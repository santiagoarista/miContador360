import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Mail, Calendar, CheckCircle, AlertCircle, Clock, User } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  const fetchSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
        setError('Error al cargar la información de suscripción');
        return;
      }

      setSubscription(data);
    } catch (err) {
      console.error('Error:', err);
      setError('Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user) return;

    setCanceling(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          canceled_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setSuccess('Suscripción cancelada exitosamente');
      setShowCancelDialog(false);
      await fetchSubscription();
    } catch (err) {
      console.error('Error canceling subscription:', err);
      setError('Error al cancelar la suscripción');
    } finally {
      setCanceling(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    if (!status) return null;
    
    const statusConfig = {
      active: {
        badge: 'bg-success/10 text-success border border-success/30',
        icon: CheckCircle,
        label: 'Activa',
      },
      cancelled: {
        badge: 'bg-destructive/10 text-destructive border border-destructive/30',
        icon: AlertCircle,
        label: 'Cancelada',
      },
      pending: {
        badge: 'bg-warning/10 text-warning border border-warning/30',
        icon: Clock,
        label: 'Pendiente',
      },
      expired: {
        badge: 'bg-warning/10 text-warning border border-warning/30',
        icon: Clock,
        label: 'Expirada',
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${config.badge} w-fit`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{config.label}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Cargando información...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle>Mi Perfil</CardTitle>
              <CardDescription>Información de tu cuenta y suscripción</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-success/30 bg-success/10">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">{success}</AlertDescription>
            </Alert>
          )}

          {/* Información de Cuenta */}
          <div className="space-y-4 pb-6 border-b border-border">
            <h3 className="font-semibold text-foreground">Información de Cuenta</h3>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-foreground font-medium break-all">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Información de Suscripción */}
          {subscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Suscripción</h3>
                {getStatusBadge(subscription.status)}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Monto */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Monto Mensual</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatCurrency(subscription.amount || 0)}
                  </p>
                </div>

                {/* Moneda */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Moneda</p>
                  <p className="text-lg font-semibold text-foreground">
                    {subscription.currency || '—'}
                  </p>
                </div>

                {/* Fecha de Inicio */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Fecha de Inicio
                  </p>
                  <p className="text-foreground font-medium">
                    {formatDate(subscription.subscription_start_date)}
                  </p>
                </div>

                {/* Fecha de Vencimiento */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Fecha de Vencimiento
                  </p>
                  <p className="text-foreground font-medium">
                    {formatDate(subscription.subscription_end_date)}
                  </p>
                </div>
              </div>

              {/* Referencia de PayU */}
              {subscription.payu_reference_code && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Código de Referencia</p>
                  <p className="text-sm font-mono text-foreground break-all">
                    {subscription.payu_reference_code}
                  </p>
                </div>
              )}

              {/* Botones de Acción */}
              {subscription.status === 'active' && (
                <div className="pt-4 border-t border-border">
                  <Button
                    variant="destructive"
                    onClick={() => setShowCancelDialog(true)}
                    disabled={canceling}
                  >
                    {canceling ? 'Cancelando...' : 'Cancelar Suscripción'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Una vez cancelada, perderás acceso a todas las funciones de la aplicación.
                  </p>
                </div>
              )}

              {(subscription.status === 'cancelled') && subscription.canceled_at && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-muted-foreground mb-1">Fecha de Cancelación</p>
                  <p className="text-foreground font-medium">
                    {formatDate(subscription.canceled_at)}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-muted-foreground">
                No tienes una suscripción activa. Por favor completa el pago para acceder a 
                todas las funciones.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Confirmación de Cancelación */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar Suscripción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Perderás acceso inmediato a la aplicación y 
              los datos estarán protegidos por 30 días (política de retención).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <AlertDialogCancel>No, mantener suscripción</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={canceling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {canceling ? 'Cancelando...' : 'Sí, cancelar'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
