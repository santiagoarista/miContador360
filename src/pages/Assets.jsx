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
import { Save } from "lucide-react";

export default function Assets() {
  const [loading, setLoading] = useState(false);
  const [initialAssets, setInitialAssets] = useState({
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
  });
  const [assets, setAssets] = useState({
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
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [hasKeyChanges, setHasKeyChanges] = useState(false);
  const [hasOtherChanges, setHasOtherChanges] = useState(false);

  useEffect(() => {
    fetchAssetsData();
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      fetchAssetsData();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const fetchInventoryValue = async (userId) => {
    const { data, error } = await supabase
      .from("inventory")
      .select("stock, purchase_value")
      .eq("user_id", userId);

    if (error) {
      console.error("[Assets] Error fetching inventory value:", error);
      return null;
    }

    return (data || []).reduce((sum, item) => {
      const stock = Number(item.stock) || 0;
      const purchaseValue = Number(item.purchase_value) || 0;
      return sum + stock * purchaseValue;
    }, 0);
  };

  const fetchAssetsData = async () => {
    console.log("[Assets] Fetching assets data...");
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log("[Assets] User ID:", user?.id);

      if (!user) return;

      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      console.log("[Assets] Assets data fetched:", data);

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        const inventoryValue = await fetchInventoryValue(user.id);
        const nextAssets = {
          ...data,
          inventarios:
            inventoryValue === null ? data.inventarios : inventoryValue,
        };

        setAssets(nextAssets);
        setInitialAssets(nextAssets);
        setHasChanges(false);
        setHasKeyChanges(false);
        setHasOtherChanges(false);

        if (inventoryValue !== null && data.inventarios !== inventoryValue) {
          const { error: updateError } = await supabase
            .from("assets")
            .update({ inventarios: inventoryValue })
            .eq("user_id", user.id);

          if (updateError) {
            console.error(
              "[Assets] Error syncing inventory value:",
              updateError,
            );
          }
        }
      }
    } catch (error) {
      console.error("[Assets] Error fetching assets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newAssets = {
      ...assets,
      [name]: parseFloat(value) || 0,
    };
    setAssets(newAssets);

    // Check if the changed fields are efectivo, bancos, or inventarios
    const keysThatShowButton = ["efectivo", "bancos", "inventarios"];
    const otherKeys = [
      "clientes",
      "vehiculo",
      "maquinaria_mobiliario",
      "equipo_comunicacion",
      "terreno",
      "casa",
      "muebles_enseres",
      "herramientas",
      "inversiones",
    ];

    const hasKeyFieldChanges = keysThatShowButton.some(
      (key) => newAssets[key] !== initialAssets[key],
    );

    const hasOtherFieldChanges = otherKeys.some(
      (key) => newAssets[key] !== initialAssets[key],
    );

    setHasKeyChanges(hasKeyFieldChanges);
    setHasOtherChanges(hasOtherFieldChanges);
    setHasChanges(hasKeyFieldChanges || hasOtherFieldChanges);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      const { error } = await supabase.from("assets").upsert({
        user_id: user.id,
        ...assets,
      });

      if (error) throw error;

      setInitialAssets(assets);
      setHasChanges(false);
      setHasKeyChanges(false);
      setHasOtherChanges(false);
      alert("Activos guardados exitosamente");
    } catch (error) {
      console.error("[Assets] Error saving assets:", error);
      alert("Error al guardar los activos");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return Object.entries(assets)
      .filter(
        ([key]) =>
          ![
            "id",
            "user_id",
            "created_at",
            "updated_at",
            "inventarios",
          ].includes(key),
      )
      .reduce((sum, [, value]) => sum + (parseFloat(value) || 0), 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <main>
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Gestión de Activos</CardTitle>
            <CardDescription>
              Total de Activos: {formatCurrency(calculateTotal())}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasKeyChanges && (
              <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <p className="text-warning font-medium">
                  ⚠️ Has modificado Efectivo, Bancos o Inventario. Recuerda
                  registrar los cambios.
                </p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="efectivo">Efectivo</Label>
                  <Input
                    id="efectivo"
                    name="efectivo"
                    type="number"
                    min="0"
                    placeholder="$ 0"
                    value={assets.efectivo}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Label htmlFor="bancos">Bancos</Label>
                  <Input
                    id="bancos"
                    name="bancos"
                    type="number"
                    min="0"
                    placeholder="$ 0"
                    value={assets.bancos}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Label htmlFor="clientes">
                    Clientes (Cuentas por Cobrar)
                  </Label>
                  <Input
                    id="clientes"
                    name="clientes"
                    type="number"
                    min="0"
                    placeholder="$ 0"
                    value={assets.clientes}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Label htmlFor="inventarios">
                    Inventarios (valor de compra)
                  </Label>
                  <Input
                    id="inventarios"
                    name="inventarios"
                    type="number"
                    min="0"
                    placeholder="$ 0"
                    value={assets.inventarios}
                    onChange={handleChange}
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label htmlFor="vehiculo">Vehículo</Label>
                  <Input
                    id="vehiculo"
                    name="vehiculo"
                    type="number"
                    min="0"
                    placeholder="$ 0"
                    value={assets.vehiculo}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Label htmlFor="maquinaria_mobiliario">
                    Maquinaria y Mobiliario
                  </Label>
                  <Input
                    id="maquinaria_mobiliario"
                    name="maquinaria_mobiliario"
                    type="number"
                    min="0"
                    placeholder="$ 0"
                    value={assets.maquinaria_mobiliario}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Label htmlFor="equipo_comunicacion">
                    Equipo de Comunicación
                  </Label>
                  <Input
                    id="equipo_comunicacion"
                    name="equipo_comunicacion"
                    type="number"
                    min="0"
                    placeholder="$ 0"
                    value={assets.equipo_comunicacion}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Label htmlFor="terreno">Terreno</Label>
                  <Input
                    id="terreno"
                    name="terreno"
                    type="number"
                    min="0"
                    placeholder="$ 0"
                    value={assets.terreno}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Label htmlFor="casa">Casa</Label>
                  <Input
                    id="casa"
                    name="casa"
                    type="number"
                    min="0"
                    placeholder="$ 0"
                    value={assets.casa}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Label htmlFor="muebles_enseres">Muebles y Enseres</Label>
                  <Input
                    id="muebles_enseres"
                    name="muebles_enseres"
                    type="number"
                    min="0"
                    placeholder="$ 0"
                    value={assets.muebles_enseres}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Label htmlFor="herramientas">Herramientas</Label>
                  <Input
                    id="herramientas"
                    name="herramientas"
                    type="number"
                    min="0"
                    placeholder="$ 0"
                    value={assets.herramientas}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Label htmlFor="inversiones">Inversiones</Label>
                  <Input
                    id="inversiones"
                    name="inversiones"
                    type="number"
                    min="0"
                    placeholder="$ 0"
                    value={assets.inversiones}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border gap-3">
                {hasChanges && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAssets(initialAssets);
                      setHasChanges(false);
                      setHasKeyChanges(false);
                      setHasOtherChanges(false);
                    }}
                  >
                    Cancelar
                  </Button>
                )}
                {hasKeyChanges && (
                  <Button type="submit" disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? "Registrando..." : "Registrar Activos"}
                  </Button>
                )}
                {hasOtherChanges && (
                  <Button type="submit" disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                )}
                {!hasChanges && (
                  <Button type="submit" disabled={true} variant="outline">
                    <Save className="w-4 h-4 mr-2" />
                    Sin cambios
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
