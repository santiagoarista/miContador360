import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft, Plus, Trash2, Edit } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export default function ThirdParties() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [thirdPartiesList, setThirdPartiesList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-xl sm:text-2xl font-bold truncate">Terceros</h1>
            </div>
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
              className="flex-shrink-0 px-2 sm:px-4"
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo Tercero</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

                <div className="flex justify-end space-x-2 pt-4 border-t">
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
            <CardDescription>Total registros: {thirdPartiesList.length}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {thirdPartiesList.map((party) => (
                <div key={party.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{party.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {party.identification_type}: {party.identification_number}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {party.email && `Email: ${party.email}`} {party.phone && `| Tel: ${party.phone}`}
                    </p>
                    {party.address && (
                      <p className="text-xs text-muted-foreground">Dirección: {party.address}</p>
                    )}
                  </div>
                  <div className="text-right mr-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      party.classification === 'Cliente' ? 'bg-blue-100 text-blue-800' :
                      party.classification === 'Proveedor' ? 'bg-green-100 text-green-800' :
                      party.classification === 'Empleado' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {party.classification}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(party)}
                    >
                      <Edit className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(party.id)}
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
