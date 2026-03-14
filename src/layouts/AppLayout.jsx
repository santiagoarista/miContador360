import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "../components/ui/sidebar";
import {
  LogOut,
  TrendingUp,
  TrendingDown,
  Wallet,
  Scale,
  Users,
  Package,
  Settings,
  LayoutDashboard,
  UserCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Label } from "../components/ui/label";
import { ModeToggle } from "../components/ModeToggle";

const navItems = [
  { path: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { path: "/income", label: "Ingresos", icon: TrendingUp },
  { path: "/expenses", label: "Gastos", icon: TrendingDown },
  { path: "/assets", label: "Activos", icon: Wallet },
  { path: "/liabilities", label: "Pasivos", icon: Scale },
  { path: "/inventory", label: "Inventario", icon: Package },
  { path: "/third-parties", label: "Terceros", icon: Users },
];

function AppSidebar({ onOpenTaxpayerDialog, onSignOut }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setOpenMobile, isMobile } = useSidebar();

  const handleNav = (path) => {
    navigate(path);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex flex-row items-center justify-between gap-2 px-2 py-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-1 group-data-[collapsible=icon]:px-1">
          <div className="flex flex-row items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold">
              M
            </div>
            <div className="flex min-w-0 flex-col gap-0 overflow-hidden group-data-[collapsible=icon]:hidden">
              <span className="font-semibold text-sidebar-foreground truncate">MiContador360</span>
              <span className="text-xs text-sidebar-foreground/70 truncate">by lopezempresarial</span>
            </div>
          </div>
          <SidebarTrigger className="flex shrink-0" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Módulos del Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => handleNav(item.path)}
                    data-active={location.pathname === item.path}
                    tooltip={item.label}
                    asChild={false}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:justify-center">
          <ModeToggle />
          <span className="text-sm text-sidebar-foreground group-data-[collapsible=icon]:hidden">Tema</span>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onOpenTaxpayerDialog} tooltip="Tipo Contribuyente" asChild={false}>
              <Settings className="h-4 w-4 shrink-0" />
              <span>Tipo Contribuyente</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => window.location.href = '/profile'} tooltip="Mi Perfil" asChild={false}>
              <UserCircle className="h-4 w-4 shrink-0" />
              <span>Mi Perfil</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onSignOut} tooltip="Cerrar Sesión" asChild={false}>
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Cerrar Sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [showTaxpayerTypeDialog, setShowTaxpayerTypeDialog] = useState(false);
  const [taxpayerType, setTaxpayerType] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (!error && data) {
        setUserProfile(data);
        setTaxpayerType(data.taxpayer_type || "");
        if (!data.taxpayer_type) setShowTaxpayerTypeDialog(true);
      }
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    const openDialog = () => setShowTaxpayerTypeDialog(true);
    window.addEventListener("open-taxpayer-dialog", openDialog);
    return () => window.removeEventListener("open-taxpayer-dialog", openDialog);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleSaveTaxpayerType = async () => {
    if (!taxpayerType) {
      alert("Por favor selecciona un tipo de contribuyente");
      return;
    }
    try {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (!u) return;
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .single();
      let error;
      if (checkError && checkError.code === "PGRST116") {
        const { error: insertError } = await supabase.from("profiles").insert({
          id: u.id,
          email: u.email,
          taxpayer_type: taxpayerType,
        });
        error = insertError;
      } else if (checkError) {
        error = checkError;
      } else if (existingProfile) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ taxpayer_type: taxpayerType })
          .eq("id", u.id);
        error = updateError;
      }
      if (error) throw error;
      setUserProfile((p) => (p ? { ...p, taxpayer_type: taxpayerType } : { taxpayer_type: taxpayerType }));
      setShowTaxpayerTypeDialog(false);
      window.dispatchEvent(new CustomEvent("profile-updated"));
    } catch (err) {
      console.error(err);
      alert("Error al guardar el tipo de contribuyente");
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar
        onOpenTaxpayerDialog={() => setShowTaxpayerTypeDialog(true)}
        onSignOut={handleSignOut}
      />
      <SidebarInset>
        <div className="min-h-screen bg-background flex flex-col">
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </SidebarInset>

      <Dialog open={showTaxpayerTypeDialog} onOpenChange={setShowTaxpayerTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Tipo de Contribuyente</DialogTitle>
            <DialogDescription>
              Selecciona tu tipo de contribuyente para cálculos fiscales precisos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="taxpayer_type">Tipo de Contribuyente</Label>
              <Select value={taxpayerType} onValueChange={setTaxpayerType}>
                <SelectTrigger id="taxpayer_type" className="mt-2">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asalariado">Asalariado</SelectItem>
                  <SelectItem value="Independiente">Independiente</SelectItem>
                  <SelectItem value="Asalariado Independiente">Asalariado Independiente</SelectItem>
                  <SelectItem value="Rentista de capital">Rentista de capital</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTaxpayerTypeDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveTaxpayerType}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
