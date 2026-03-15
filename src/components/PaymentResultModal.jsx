import React from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function PaymentResultModal({ 
  isOpen, 
  status, // 'approved', 'declined', 'pending'
  message,
  transactionId,
  onClose,
  onContinue 
}) {
  if (!isOpen) return null;

  const isApproved = status === 'approved';
  const isDeclined = status === 'declined';
  const isPending = status === 'pending';

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            {isApproved && (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            )}
            {isDeclined && (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            )}
            {isPending && (
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
            )}
          </div>
          <DialogTitle className="text-center text-xl">
            {isApproved && '¡Pago Aprobado!'}
            {isDeclined && 'Pago Denegado'}
            {isPending && 'Pago Pendiente'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Main message */}
          <Alert variant={isApproved ? 'default' : 'destructive'}>
            <AlertDescription>{message}</AlertDescription>
          </Alert>

          {/* Approved benefits */}
          {isApproved && (
            <div className="bg-green-50 rounded-lg p-4 space-y-3">
              <p className="font-semibold text-sm">Ahora tiene acceso a:</p>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Gestión completa de ingresos, gastos, activos y pasivos</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Reportes y análisis financieros detallados</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Soporte técnico prioritario</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Actualizaciones automáticas e nuevas funcionalidades</span>
                </li>
              </ul>
            </div>
          )}

          {/* Transaction ID */}
          {transactionId && (
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">ID de Transacción</p>
              <p className="text-sm font-mono break-all">{transactionId}</p>
            </div>
          )}

          {/* Declined advice */}
          {isDeclined && (
            <div className="bg-red-50 rounded-lg p-4 space-y-3">
              <p className="font-semibold text-sm">Posibles razones:</p>
              <ul className="space-y-2 text-sm list-disc list-inside">
                <li>Fondos insuficientes</li>
                <li>Tarjeta expirada o datos incorrectos</li>
                <li>Transacción rechazada por el banco</li>
                <li>Tarjeta bloqueada por seguridad</li>
              </ul>
              <p className="text-sm mt-4">
                <strong>Solución:</strong> Verifica los datos de tu tarjeta e intenta nuevamente, o usa otra tarjeta.
              </p>
            </div>
          )}

          {/* Pending advice */}
          {isPending && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm">
                Tu transacción está en proceso. Te enviaremos un correo con la confirmación en los próximos minutos.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2 pt-4">
            {isApproved && (
              <Button 
                onClick={onContinue}
                className="w-full"
                size="lg"
              >
                Ir al Panel de Control
              </Button>
            )}
            {isDeclined && (
              <>
                <Button 
                  onClick={onContinue}
                  className="w-full"
                  variant="outline"
                  size="lg"
                >
                  Intentar Nuevamente
                </Button>
                <Button 
                  onClick={onClose}
                  className="w-full"
                  variant="ghost"
                  size="lg"
                >
                  Cancelar
                </Button>
              </>
            )}
            {isPending && (
              <Button 
                onClick={onContinue}
                className="w-full"
                variant="outline"
                size="lg"
              >
                Continuar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
