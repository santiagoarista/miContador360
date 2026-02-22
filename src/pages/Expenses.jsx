import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { ArrowLeft, Plus, Trash2, Edit } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

export default function Expenses() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [expensesList, setExpensesList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);

  const [formData, setFormData] = useState({
    expense_date: new Date().toISOString().split("T")[0],
    payee_name: "",
    concept: "Arriendo",
    detail: "",
    value: 0,
    payment_method: "Efectivo",
  });

  useEffect(() => {
    fetchExpensesData();
    fetchBeneficiaries();
  }, []);

  const fetchExpensesData = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("expense_date", { ascending: false });

      if (error) throw error;
      setExpensesList(data || []);
    } catch (error) {
      console.error("[Expenses] Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBeneficiaries = async () => {
    console.log("[Expenses] Fetching beneficiaries...");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      console.log("[Expenses] User ID:", user.id);

      const { data, error } = await supabase
        .from("third_parties")
        .select("id, full_name")
        .eq("user_id", user.id)
        .in("classification", ["Proveedor", "Empleado", "Otro"])
        .order("full_name", { ascending: true });

      if (error) throw error;
      console.log("[Expenses] Beneficiaries fetched:", data);
      setBeneficiaries(data || []);
    } catch (error) {
      console.error("[Expenses] Error fetching beneficiaries:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "value" ? parseFloat(value) || 0 : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const normalizePaymentMethod = (method) =>
        (method || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();

      const createBaseAssets = (currentAssets) =>
        currentAssets
          ? {
              efectivo: currentAssets.efectivo || 0,
              bancos: currentAssets.bancos || 0,
              clientes: currentAssets.clientes || 0,
              inventarios: currentAssets.inventarios || 0,
              vehiculo: currentAssets.vehiculo || 0,
              maquinaria_mobiliario: currentAssets.maquinaria_mobiliario || 0,
              equipo_comunicacion: currentAssets.equipo_comunicacion || 0,
              terreno: currentAssets.terreno || 0,
              casa: currentAssets.casa || 0,
              muebles_enseres: currentAssets.muebles_enseres || 0,
              herramientas: currentAssets.herramientas || 0,
              inversiones: currentAssets.inversiones || 0,
            }
          : {
              efectivo: 0,
              bancos: 0,
              clientes: 0,
              inventarios: 0,
              vehiculo: 0,
              maquinaria_mobiliario: 0,
              equipo_comunicacion: 0,
              terreno: 0,
              casa: 0,
              muebles_enseres: 0,
              herramientas: 0,
              inversiones: 0,
            };

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      console.log(
        "[Expenses] Processing expense with payment method:",
        formData.payment_method,
      );

      // Si estamos editando, obtener el gasto original para revertir sus efectos
      let originalExpense = null;
      if (editingId) {
        const { data, error } = await supabase
          .from("expenses")
          .select("*")
          .eq("id", editingId)
          .single();

        if (error) throw error;
        originalExpense = data;
        console.log("[Expenses] Original expense:", originalExpense);
      }

      // Revertir efectos del método de pago original (si estamos editando)
      if (originalExpense) {
        const originalValue = parseFloat(originalExpense.value) || 0;
        const originalMethod = normalizePaymentMethod(
          originalExpense.payment_method,
        );

        // Revertir activos si el método original era Efectivo o Transferencia
        if (
          originalMethod === "efectivo" ||
          originalMethod === "transferencia bancaria"
        ) {
          const { data: assetsData, error: assetsError } = await supabase
            .from("assets")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (assetsError && assetsError.code !== "PGRST116") {
            console.error("[Expenses] Error fetching assets:", assetsError);
            throw new Error("No se pudieron obtener los activos");
          }

          const assetField =
            originalMethod === "efectivo" ? "efectivo" : "bancos";
          const baseAssets = createBaseAssets(assetsData);
          const currentBalance = baseAssets[assetField] || 0;
          const revertedBalance = currentBalance + originalValue;

          console.log(
            `[Expenses] Reverting ${assetField}: ${currentBalance} + ${originalValue} = ${revertedBalance}`,
          );

          const { error: updateError } = await supabase.from("assets").upsert(
            {
              user_id: user.id,
              ...baseAssets,
              [assetField]: revertedBalance,
            },
            { onConflict: "user_id" },
          );

          if (updateError) {
            console.error("[Expenses] Error reverting assets:", updateError);
            throw new Error("No se pudo revertir el saldo de activos");
          }
        }

        // Revertir pasivos si el método original era Cuenta por pagar
        if (originalMethod === "cuenta por pagar") {
          const { data: liabilitiesData, error: liabilitiesError } =
            await supabase
              .from("liabilities")
              .select("*")
              .eq("user_id", user.id)
              .single();

          if (liabilitiesError && liabilitiesError.code !== "PGRST116") {
            console.error(
              "[Expenses] Error fetching liabilities:",
              liabilitiesError,
            );
            throw new Error("No se pudieron obtener los pasivos");
          }

          const currentCuentasPorPagar =
            liabilitiesData?.cuentas_por_pagar || 0;
          const revertedCuentasPorPagar =
            currentCuentasPorPagar - originalValue; // Revertir: restar

          console.log(
            `[Expenses] Reverting cuentas_por_pagar: ${currentCuentasPorPagar} - ${originalValue} = ${revertedCuentasPorPagar}`,
          );

          if (liabilitiesData) {
            const { error: updateError } = await supabase
              .from("liabilities")
              .update({
                cuentas_por_pagar: revertedCuentasPorPagar,
                proveedores: liabilitiesData?.proveedores || 0,
                obligaciones_financieras:
                  liabilitiesData?.obligaciones_financieras || 0,
                salarios_por_pagar: liabilitiesData?.salarios_por_pagar || 0,
              })
              .eq("user_id", user.id);

            if (updateError) {
              console.error(
                "[Expenses] Error reverting liabilities:",
                updateError,
              );
              throw new Error("No se pudo revertir las cuentas por pagar");
            }
          }
        }
      }

      // Aplicar efectos del nuevo método de pago
      // Si el método de pago es Efectivo o Transferencia, validar saldo y actualizar activos
      const methodNew = normalizePaymentMethod(formData.payment_method);

      if (methodNew === "efectivo" || methodNew === "transferencia bancaria") {
        // Obtener activos actuales
        const { data: assetsData, error: assetsError } = await supabase
          .from("assets")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (assetsError && assetsError.code !== "PGRST116") {
          console.error("[Expenses] Error fetching assets:", assetsError);
          throw new Error("No se pudieron obtener los activos");
        }

        console.log("[Expenses] Current assets:", assetsData);

        // Validar saldo suficiente
        const assetField = methodNew === "efectivo" ? "efectivo" : "bancos";
        const baseAssets = createBaseAssets(assetsData);
        const currentBalance = baseAssets[assetField] || 0;
        const expenseValue = parseFloat(formData.value) || 0;

        console.log(
          `[Expenses] Validating ${assetField}: current=${currentBalance}, expense=${expenseValue}`,
        );

        if (currentBalance < expenseValue) {
          const assetName =
            formData.payment_method === "Efectivo" ? "efectivo" : "bancos";
          alert(
            `No puede hacer este registro porque no cuenta con el dinero suficiente en ${assetName}. Saldo disponible: $${currentBalance.toLocaleString("es-CO")}`,
          );
          setLoading(false);
          return;
        }

        // Calcular nuevo saldo
        const newBalance = currentBalance - expenseValue;
        console.log(`[Expenses] New balance for ${assetField}:`, newBalance);

        // Actualizar activos
        const { error: updateError } = await supabase.from("assets").upsert(
          {
            user_id: user.id,
            ...baseAssets,
            [assetField]: newBalance,
          },
          { onConflict: "user_id" },
        );

        if (updateError) {
          console.error("[Expenses] Error updating assets:", updateError);
          throw new Error("No se pudo actualizar el saldo de activos");
        }

        console.log("[Expenses] Assets updated successfully");
      }

      // Si el método de pago es Cuenta por pagar, actualizar pasivos
      if (methodNew === "cuenta por pagar") {
        // Obtener pasivos actuales
        const { data: liabilitiesData, error: liabilitiesError } =
          await supabase
            .from("liabilities")
            .select("*")
            .eq("user_id", user.id)
            .single();

        if (liabilitiesError && liabilitiesError.code !== "PGRST116") {
          console.error(
            "[Expenses] Error fetching liabilities:",
            liabilitiesError,
          );
          throw new Error("No se pudieron obtener los pasivos");
        }

        console.log("[Expenses] Current liabilities:", liabilitiesData);

        const currentCuentasPorPagar = liabilitiesData?.cuentas_por_pagar || 0;
        const expenseValue = parseFloat(formData.value) || 0;
        const newCuentasPorPagar = currentCuentasPorPagar + expenseValue;

        console.log(
          `[Expenses] Updating cuentas_por_pagar: ${currentCuentasPorPagar} + ${expenseValue} = ${newCuentasPorPagar}`,
        );

        // Actualizar pasivos
        // Si existe el registro, usar update; si no, usar upsert con onConflict
        const updateData = {
          cuentas_por_pagar: newCuentasPorPagar,
          proveedores: liabilitiesData?.proveedores || 0,
          obligaciones_financieras:
            liabilitiesData?.obligaciones_financieras || 0,
          salarios_por_pagar: liabilitiesData?.salarios_por_pagar || 0,
        };

        let updateLiabilitiesError;
        if (liabilitiesData) {
          // El registro existe, usar update
          const { error } = await supabase
            .from("liabilities")
            .update(updateData)
            .eq("user_id", user.id);
          updateLiabilitiesError = error;
        } else {
          // El registro no existe, usar upsert con onConflict
          const { error } = await supabase.from("liabilities").upsert(
            {
              user_id: user.id,
              ...updateData,
            },
            { onConflict: "user_id" },
          );
          updateLiabilitiesError = error;
        }

        if (updateLiabilitiesError) {
          console.error(
            "[Expenses] Error updating liabilities:",
            updateLiabilitiesError,
          );
          throw new Error("No se pudo actualizar las cuentas por pagar");
        }

        console.log("[Expenses] Liabilities updated successfully");
      }

      if (editingId) {
        // Actualizar registro existente
        const { error } = await supabase
          .from("expenses")
          .update({
            ...formData,
            total: formData.value,
          })
          .eq("id", editingId);

        if (error) throw error;
        console.log("[Expenses] Expense updated successfully");
      } else {
        // Crear nuevo registro
        const { error } = await supabase.from("expenses").insert({
          user_id: user.id,
          ...formData,
          total: formData.value,
        });

        if (error) throw error;
        console.log("[Expenses] Expense created successfully");
      }

      setFormData({
        expense_date: new Date().toISOString().split("T")[0],
        payee_name: "",
        concept: "Arriendo",
        detail: "",
        value: 0,
        payment_method: "Efectivo",
      });

      setShowForm(false);
      setEditingId(null);
      fetchExpensesData();
    } catch (error) {
      console.error("[Expenses] Error saving expense:", error);
      alert(error.message || "Error al guardar el gasto");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expense) => {
    console.log("[Expenses] Editing expense:", expense);
    setFormData({
      expense_date: expense.expense_date,
      payee_name: expense.payee_name,
      concept: expense.concept,
      detail: expense.detail || "",
      value: expense.value,
      payment_method: expense.payment_method,
    });
    setEditingId(expense.id);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setFormData({
      expense_date: new Date().toISOString().split("T")[0],
      payee_name: "",
      concept: "Arriendo",
      detail: "",
      value: 0,
      payment_method: "Efectivo",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Estás seguro de eliminar este gasto?")) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const expenseToDelete = expensesList.find((item) => item.id === id);

      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;

      if (expenseToDelete) {
        const normalizePaymentMethod = (method) =>
          (method || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();

        const createBaseAssets = (currentAssets) =>
          currentAssets
            ? {
                efectivo: currentAssets.efectivo || 0,
                bancos: currentAssets.bancos || 0,
                clientes: currentAssets.clientes || 0,
                inventarios: currentAssets.inventarios || 0,
                vehiculo: currentAssets.vehiculo || 0,
                maquinaria_mobiliario: currentAssets.maquinaria_mobiliario || 0,
                equipo_comunicacion: currentAssets.equipo_comunicacion || 0,
                terreno: currentAssets.terreno || 0,
                casa: currentAssets.casa || 0,
                muebles_enseres: currentAssets.muebles_enseres || 0,
                herramientas: currentAssets.herramientas || 0,
                inversiones: currentAssets.inversiones || 0,
              }
            : {
                efectivo: 0,
                bancos: 0,
                clientes: 0,
                inventarios: 0,
                vehiculo: 0,
                maquinaria_mobiliario: 0,
                equipo_comunicacion: 0,
                terreno: 0,
                casa: 0,
                muebles_enseres: 0,
                herramientas: 0,
                inversiones: 0,
              };

        const expenseValue = parseFloat(expenseToDelete.value) || 0;
        const method = normalizePaymentMethod(expenseToDelete.payment_method);

        if (method === "efectivo" || method === "transferencia bancaria") {
          const { data: assetsData, error: assetsError } = await supabase
            .from("assets")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (assetsError && assetsError.code !== "PGRST116") {
            console.error("[Expenses] Error fetching assets:", assetsError);
            throw new Error("No se pudieron obtener los activos");
          }

          const assetField = method === "efectivo" ? "efectivo" : "bancos";
          const baseAssets = createBaseAssets(assetsData);
          const newBalance = (baseAssets[assetField] || 0) + expenseValue;

          const { error: updateError } = await supabase.from("assets").upsert(
            {
              user_id: user.id,
              ...baseAssets,
              [assetField]: newBalance,
            },
            { onConflict: "user_id" },
          );

          if (updateError) {
            console.error("[Expenses] Error reverting assets:", updateError);
            throw new Error("No se pudo revertir el saldo de activos");
          }
        }

        if (method === "cuenta por pagar") {
          const { data: liabilitiesData, error: liabilitiesError } =
            await supabase
              .from("liabilities")
              .select("*")
              .eq("user_id", user.id)
              .single();

          if (liabilitiesError && liabilitiesError.code !== "PGRST116") {
            console.error(
              "[Expenses] Error fetching liabilities:",
              liabilitiesError,
            );
            throw new Error("No se pudieron obtener los pasivos");
          }

          if (liabilitiesData) {
            const currentCuentasPorPagar =
              liabilitiesData?.cuentas_por_pagar || 0;
            const newCuentasPorPagar = currentCuentasPorPagar - expenseValue;

            const { error: updateError } = await supabase
              .from("liabilities")
              .update({
                cuentas_por_pagar: newCuentasPorPagar,
                proveedores: liabilitiesData?.proveedores || 0,
                obligaciones_financieras:
                  liabilitiesData?.obligaciones_financieras || 0,
                salarios_por_pagar: liabilitiesData?.salarios_por_pagar || 0,
              })
              .eq("user_id", user.id);

            if (updateError) {
              console.error(
                "[Expenses] Error reverting liabilities:",
                updateError,
              );
              throw new Error("No se pudo revertir las cuentas por pagar");
            }
          }
        }
      }

      fetchExpensesData();
    } catch (error) {
      console.error("[Expenses] Error deleting expense:", error);
      alert("Error al eliminar el gasto");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-xl sm:text-2xl font-bold truncate">Gastos</h1>
            </div>
            <Button
              onClick={() => setShowForm(!showForm)}
              size="sm"
              className="flex-shrink-0 px-2 sm:px-4"
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo Gasto</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>
                {editingId ? "Editar Gasto" : "Registrar Nuevo Gasto"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expense_date">Fecha</Label>
                    <Input
                      id="expense_date"
                      name="expense_date"
                      type="date"
                      value={formData.expense_date}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="payee_name">Beneficiario</Label>
                    <Select
                      value={formData.payee_name}
                      onValueChange={(value) =>
                        setFormData({ ...formData, payee_name: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un beneficiario" />
                      </SelectTrigger>
                      <SelectContent>
                        {beneficiaries.map((beneficiary) => (
                          <SelectItem
                            key={beneficiary.id}
                            value={beneficiary.full_name}
                          >
                            {beneficiary.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="concept">Concepto</Label>
                    <Select
                      value={formData.concept}
                      onValueChange={(value) =>
                        setFormData({ ...formData, concept: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Arriendo">Arriendo</SelectItem>
                        <SelectItem value="Pago de personal">
                          Pago de personal
                        </SelectItem>
                        <SelectItem value="Linea movil">Línea móvil</SelectItem>
                        <SelectItem value="Internet">Internet</SelectItem>
                        <SelectItem value="Servicio energia">
                          Servicio energía
                        </SelectItem>
                        <SelectItem value="Servicio de agua">
                          Servicio de agua
                        </SelectItem>
                        <SelectItem value="Publicidad">Publicidad</SelectItem>
                        <SelectItem value="Transporte">Transporte</SelectItem>
                        <SelectItem value="Honorarios">Honorarios</SelectItem>
                        <SelectItem value="Otros pagos">Otros pagos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="payment_method">Método de Pago</Label>
                    <Select
                      value={formData.payment_method}
                      onValueChange={(value) =>
                        setFormData({ ...formData, payment_method: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Efectivo">Efectivo</SelectItem>
                        <SelectItem value="Transferencia bancaria">
                          Transferencia bancaria
                        </SelectItem>
                        <SelectItem value="Cuenta por pagar">
                          Cuenta por pagar
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="value">Valor</Label>
                    <Input
                      id="value"
                      name="value"
                      type="number"
                      min="0"
                      placeholder="$ 0"
                      value={formData.value}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="detail">Detalle</Label>
                  <Input
                    id="detail"
                    name="detail"
                    value={formData.detail}
                    onChange={handleChange}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading
                      ? "Guardando..."
                      : editingId
                        ? "Actualizar"
                        : "Guardar"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Historial de Gastos</CardTitle>
            <CardDescription>
              Total:{" "}
              {formatCurrency(
                expensesList.reduce((sum, item) => sum + item.total, 0),
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expensesList.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{expense.payee_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {expense.concept} - {expense.expense_date}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {expense.detail}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">
                      {formatCurrency(expense.total)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {expense.payment_method}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(expense)}
                    >
                      <Edit className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(expense.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
