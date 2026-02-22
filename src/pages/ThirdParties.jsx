import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Plus, Trash2, Edit } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '../components/ui/pagination';

const PAGE_SIZE = 10;

export default function ThirdParties() {
  const [loading, setLoading] = useState(false);
  const [thirdPartiesList, setThirdPartiesList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState({
    full_name: '',
    identification_type: 'Cedula',
    identification_number: '',
    email: '',
    phone: '',
    address: '',
    classification: 'Cliente'
  });

  useEffect(() => {
    fetchThirdPartiesData();
  }, []);

  useEffect(() => {
    const totalP = Math.max(1, Math.ceil(thirdPartiesList.length / PAGE_SIZE));
    if (currentPage > totalP) setCurrentPage(1);
  }, [thirdPartiesList.length]);

  const fetchThirdPartiesData = async () => {
    console.log('[ThirdParties] Fetching third parties data...');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[ThirdParties] User ID:', user?.id);

      if (!user) return;

      const { data, error } = await supabase
        .from('third_parties')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('[ThirdParties] Third parties data fetched:', data);

      if (error) throw error;

      setThirdPartiesList(data || []);
    } catch (error) {
      console.error('[ThirdParties] Error fetching third parties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const thirdPartyData = {
        user_id: user.id,
        ...formData
      };

      let error;
      if (editingId) {
        ({ error } = await supabase
          .from('third_parties')
          .update(thirdPartyData)
          .eq('id', editingId));
      } else {
        ({ error } = await supabase
          .from('third_parties')
          .insert(thirdPartyData));
      }

      if (error) throw error;

      setFormData({
        full_name: '',
        identification_type: 'Cedula',
        identification_number: '',
        email: '',
        phone: '',
        address: '',
        classification: 'Cliente'
      });

      setShowForm(false);
      setEditingId(null);
      fetchThirdPartiesData();
    } catch (error) {
      console.error('[ThirdParties] Error saving third party:', error);
      alert('Error al guardar el tercero');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setFormData({
      full_name: item.full_name,
      identification_type: item.identification_type,
      identification_number: item.identification_number,
      email: item.email,
      phone: item.phone,
      address: item.address,
      classification: item.classification
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este tercero?')) return;

    try {
      const { error } = await supabase.from('third_parties').delete().eq('id', id);
      if (error) throw error;
      fetchThirdPartiesData();
    } catch (error) {
      console.error('[ThirdParties] Error deleting third party:', error);
      alert('Error al eliminar el tercero');
    }
  };

  const totalItems = thirdPartiesList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
  const paginatedList = thirdPartiesList.slice(startIndex, endIndex);

  const goToPage = (page) => {
    const p = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(p);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Terceros</h1>
        <Button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({
              full_name: '',
              identification_type: 'Cedula',
              identification_number: '',
              email: '',
              phone: '',
              address: '',
              classification: 'Cliente'
            });
          }}
          size="sm"
          className="px-2 sm:px-4"
        >
          <Plus className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Nuevo Tercero</span>
        </Button>
      </div>

      <main>
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingId ? 'Editar Tercero' : 'Registrar Nuevo Tercero'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Nombre Completo</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="classification">Clasificación</Label>
                    <Select value={formData.classification} onValueChange={(value) => setFormData({ ...formData, classification: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cliente">Cliente</SelectItem>
                        <SelectItem value="Proveedor">Proveedor</SelectItem>
                        <SelectItem value="Empleado">Empleado</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="identification_type">Tipo de Identificación</Label>
                    <Select value={formData.identification_type} onValueChange={(value) => setFormData({ ...formData, identification_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cedula">Cédula</SelectItem>
                        <SelectItem value="NIT">NIT</SelectItem>
                        <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="identification_number">Número de Identificación</Label>
                    <Input
                      id="identification_number"
                      name="identification_number"
                      value={formData.identification_number}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Lista de Terceros</CardTitle>
            <CardDescription>
              {totalItems === 0
                ? 'Total registros: 0'
                : `Mostrando ${startIndex + 1}-${endIndex} de ${totalItems} registros`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo ID</TableHead>
                  <TableHead>Nº Identificación</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Teléfono</TableHead>
                  <TableHead className="hidden xl:table-cell">Dirección</TableHead>
                  <TableHead>Clasificación</TableHead>
                  <TableHead className="w-[90px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No hay terceros registrados. Agrega uno con el botón &quot;Nuevo Tercero&quot;.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedList.map((party) => (
                    <TableRow key={party.id}>
                      <TableCell className="font-medium">{party.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{party.identification_type}</TableCell>
                      <TableCell>{party.identification_number}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{party.email || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{party.phone || '—'}</TableCell>
                      <TableCell className="hidden xl:table-cell text-muted-foreground max-w-[200px] truncate" title={party.address}>
                        {party.address || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={party.classification === 'Cliente' ? 'default' : 'secondary'}
                          className={
                            party.classification === 'Proveedor' ? 'bg-success/10 text-success border-border' :
                            party.classification === 'Empleado' ? 'bg-warning/10 text-warning border-border' :
                            party.classification === 'Otro' ? 'bg-muted text-muted-foreground border-border' : ''
                          }
                        >
                          {party.classification}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(party)}
                            aria-label="Editar"
                          >
                            <Edit className="w-4 h-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDelete(party.id)}
                            aria-label="Eliminar"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {totalItems > PAGE_SIZE && (
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        goToPage(safePage - 1);
                      }}
                      className={
                        safePage <= 1
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          goToPage(page);
                        }}
                        isActive={page === safePage}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        goToPage(safePage + 1);
                      }}
                      className={
                        safePage >= totalPages
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
