import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Save, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

export default function Liabilities() {
  const [loading, setLoading] = useState(false);
  const [liabilities, setLiabilities] = useState({
    proveedores: 0,
    obligaciones_financieras: 0,
    cuentas_por_pagar: 0,
    salarios_por_pagar: 0,
  });
  const [assets, setAssets] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentData, setPaymentData] = useState({
    liability_type: "proveedores",
    amount: 0,
    payment_method: "Efectivo",
  });

  useEffect(() => {
    fetchLiabilitiesData();
    fetchAssetsData();
  }, []);

  const fetchLiabilitiesData = async () => {
    console.log("[Liabilities] Fetching liabilities and assets data...");
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log("[Liabilities] User ID:", user?.id);

      if (!user) return;

      const { data, error } = await supabase
        .from("liabilities")
        .select("*")
        .eq("user_id", user.id)
        .single();

      console.log("[Liabilities] Liabilities data fetched:", data);

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setLiabilities(data);
      }
    } catch (error) {
      console.error("[Liabilities] Error fetching liabilities:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssetsData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      console.log("[Liabilities] Assets data fetched:", data);

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setAssets(data);
      }
    } catch (error) {
      console.error("[Liabilities] Error fetching assets:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLiabilities({
      ...liabilities,
      [name]: parseFloat(value) || 0,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { error } = await supabase.from("liabilities").upsert({
        user_id: user.id,
        ...liabilities,
      });

      if (error) throw error;

      alert("Pasivos guardados exitosamente");
    } catch (error) {
      console.error("[Liabilities] Error saving liabilities:", error);
      alert("Error al guardar los pasivos");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalLiabilities = () => {
    return Object.entries(liabilities)
      .filter(
        ([key]) => !["id", "user_id", "created_at", "updated_at"].includes(key),
      )
      .reduce((sum, [, value]) => sum + (parseFloat(value) || 0), 0);
  };

  const calculateTotalAssets = () => {
    if (!assets) return 0;
    return Object.entries(assets)
      .filter(
        ([key]) => !["id", "user_id", "created_at", "updated_at"].includes(key),
      )
      .reduce((sum, [, value]) => sum + (parseFloat(value) || 0), 0);
  };

  const calculateEquity = () => {
    return calculateTotalAssets() - calculateTotalLiabilities();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handlePayDebt = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const debtAmount = parseFloat(paymentData.amount) || 0;

      if (debtAmount <= 0) {
        alert("Ingresa un monto válido");
        setLoading(false);
        return;
      }

      // Validar que hay suficiente saldo en el método de pago seleccionado
      const assetField =
        paymentData.payment_method === "Efectivo" ? "efectivo" : "bancos";
      const currentAssetBalance = assets?.[assetField] || 0;

      if (currentAssetBalance < debtAmount) {
        alert(
          `No tienes suficiente saldo en ${paymentData.payment_method}. Saldo disponible: ${formatCurrency(currentAssetBalance)}`,
        );
        setLoading(false);
        return;
      }

      // Validar que hay suficiente deuda para cancelar
      const currentDebt = liabilities[paymentData.liability_type] || 0;
      if (currentDebt < debtAmount) {
        alert(
          `El monto a pagar (${formatCurrency(debtAmount)}) es mayor que la deuda actual (${formatCurrency(currentDebt)})`,
        );
        setLoading(false);
        return;
      }

      console.log("[Liabilities] Paying debt:", paymentData);

      // Actualizar pasivos (reducir deuda)
      const newDebtAmount = currentDebt - debtAmount;
      const { error: liabilitiesError } = await supabase
        .from("liabilities")
        .update({
          [paymentData.liability_type]: newDebtAmount,
        })
        .eq("user_id", user.id);

      if (liabilitiesError) throw liabilitiesError;

      // Actualizar activos (reducir efectivo o bancos)
      const newAssetBalance = currentAssetBalance - debtAmount;
      const { error: assetsError } = await supabase
        .from("assets")
        .update({
          [assetField]: newAssetBalance,
        })
        .eq("user_id", user.id);

      if (assetsError) throw assetsError;

      alert("Deuda cancelada exitosamente");

      // Resetear formulario y cerrar modal
      setPaymentData({
        liability_type: "proveedores",
        amount: 0,
        payment_method: "Efectivo",
      });
      setShowPaymentDialog(false);

      // Recargar datos
      fetchLiabilitiesData();
      fetchAssetsData();
    } catch (error) {
      console.error("[Liabilities] Error paying debt:", error);
      alert("Error al cancelar la deuda: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <main className="space-y-8">
        {/* Summary Cards - same style as Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(calculateTotalAssets())}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pasivos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">
                {formatCurrency(calculateTotalLiabilities())}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Patrimonio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(calculateEquity())}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Liabilities Form - same card style as Income/Expenses */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Gestión de Pasivos</CardTitle>
                <CardDescription>
                  Actualiza el valor de tus obligaciones
                </CardDescription>
              </div>
              <Dialog
                open={showPaymentDialog}
                onOpenChange={setShowPaymentDialog}
              >
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Cancelar Deudas
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cancelar Deuda</DialogTitle>
                    <DialogDescription>
                      Selecciona el tipo de deuda y método de pago
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="liability_type">Tipo de Deuda</Label>
                      <Select
                        value={paymentData.liability_type}
                        onValueChange={(value) =>
                          setPaymentData({
                            ...paymentData,
                            liability_type: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="proveedores">
                            Proveedores (
                            {formatCurrency(liabilities.proveedores)})
                          </SelectItem>
                          <SelectItem value="obligaciones_financieras">
                            Obligaciones Financieras (
                            {formatCurrency(
                              liabilities.obligaciones_financieras,
                            )}
                            )
                          </SelectItem>
                          <SelectItem value="cuentas_por_pagar">
                            Cuentas por Pagar (
                            {formatCurrency(liabilities.cuentas_por_pagar)})
                          </SelectItem>
                          <SelectItem value="salarios_por_pagar">
                            Salarios por Pagar (
                            {formatCurrency(liabilities.salarios_por_pagar)})
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="payment_amount">Monto a Pagar</Label>
                      <Input
                        id="payment_amount"
                        type="number"
                        min="0"
                        placeholder="$ 0"
                        value={paymentData.amount}
                        onChange={(e) =>
                          setPaymentData({
                            ...paymentData,
                            amount: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="payment_method">Método de Pago</Label>
                      <Select
                        value={paymentData.payment_method}
                        onValueChange={(value) =>
                          setPaymentData({
                            ...paymentData,
                            payment_method: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Efectivo">
                            Efectivo ({formatCurrency(assets?.efectivo || 0)})
                          </SelectItem>
                          <SelectItem value="Bancos">
                            Bancos ({formatCurrency(assets?.bancos || 0)})
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowPaymentDialog(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={handlePayDebt}
                        disabled={loading}
                      >
                        {loading ? "Procesando..." : "Pagar Deuda"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="proveedores">Proveedores</Label>
                  <Input
                    id="proveedores"
                    name="proveedores"
                    type="number"
                    min="0"
                    placeholder="$ 0"
                    value={liabilities.proveedores}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Label htmlFor="obligaciones_financieras">
                    Obligaciones Financieras
                  </Label>
                  <Input
                    id="obligaciones_financieras"
                    name="obligaciones_financieras"
                    type="number"
                    min="0"
                    placeholder="$ 0"
                    value={liabilities.obligaciones_financieras}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Label htmlFor="cuentas_por_pagar">Cuentas por Pagar</Label>
                  <Input
                    id="cuentas_por_pagar"
                    name="cuentas_por_pagar"
                    type="number"
                    min="0"
                    placeholder="$ 0"
                    value={liabilities.cuentas_por_pagar}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Label htmlFor="salarios_por_pagar">Salarios por Pagar</Label>
                  <Input
                    id="salarios_por_pagar"
                    name="salarios_por_pagar"
                    type="number"
                    min="0"
                    placeholder="$ 0"
                    value={liabilities.salarios_por_pagar}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <Button type="submit" disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
