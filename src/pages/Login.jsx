import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    console.log('[Login] Starting sign in for:', formData.email);

    try {
      const { data, error: signInError } = await signIn({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        console.error('[Login] Sign in error:', signInError);
        setError(signInError.message);
      } else if (data.user) {
        console.log('[Login] User signed in successfully:', data.user.id);

        // Check if user has an active subscription
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', data.user.id)
          .single();

        if (sub?.status === 'active') {
          navigate('/dashboard');
        } else {
          navigate('/subscription-payment');
        }
      }
    } catch (err) {
      console.error('[Login] Unexpected error:', err);
      setError('Error inesperado al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    console.log('[Login] Starting sign up for:', formData.email);

    try {
      const { data, error: signUpError } = await signUp({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
      });

      if (signUpError) {
        console.error('[Login] Sign up error:', signUpError);
        if (signUpError.message && signUpError.message.includes('already exists')) {
            setError('Ya existe una cuenta con este email. Por favor inicia sesión o restablece tu contraseña.');
        } else {
            setError(signUpError.message || 'Error al crear la cuenta');
        }
      } else if (data && data.user) {
        console.log('[Login] Sign up successful! User ID:', data.user.id);
        // Redirect to subscription payment page
        navigate('/subscription-payment');
      }
    } catch (err) {
      console.error('[Login] Unexpected error:', err);
      setError('Error inesperado al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin
              ? 'Ingresa tus credenciales para acceder'
              : 'Completa el formulario para registrarte'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre Completo</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Tu nombre completo"
                  value={formData.fullName}
                  onChange={handleChange}
                  required={!isLogin}
                  disabled={loading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setMessage('');
                }}
                className="text-sm text-primary hover:underline"
                disabled={loading}
              >
                {isLogin
                  ? '¿No tienes cuenta? Regístrate'
                  : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
