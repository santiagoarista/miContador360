import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async ({ email, password, fullName }) => {
    try {
      // FATAL ERROR: Profiles table MUST exist
      // Check if profiles table exists by attempting to query it
      const { error: tableCheckError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (tableCheckError) {
        if (tableCheckError.code === 'PGRST205' || tableCheckError.message.includes('does not exist')) {
          console.error('FATAL ERROR: profiles table does not exist');
          throw new Error('FATAL ERROR: profiles table does not exist. Authentication cannot proceed. The profiles table must be created via migration before authentication can work.');
        }
        throw tableCheckError;
      }

      // Check if user already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .single();

      if (existingProfile) {
        throw new Error('An account with this email already exists. Please login instead.');
      }

      // Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Failed to create account');

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email,
          full_name: fullName,
        });

      if (profileError) {
        throw new Error('Account created but profile setup failed. Please contact support.');
      }

      // Initialize assets record
      const { error: assetsError } = await supabase
        .from('assets')
        .insert({
          user_id: authData.user.id,
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
          inversiones: 0
        });

      if (assetsError) {
        console.error('Assets initialization error:', assetsError);
        // Don't throw here, just log, as profile is created
      }

      // Initialize liabilities record
      const { error: liabilitiesError } = await supabase
        .from('liabilities')
        .insert({
          user_id: authData.user.id,
          proveedores: 0,
          obligaciones_financieras: 0,
          cuentas_por_pagar: 0,
          salarios_por_pagar: 0
        });

      if (liabilitiesError) {
        console.error('Liabilities initialization error:', liabilitiesError);
      }

      // Optional: auto-confirm so user can sign in without email verification.
      // In Supabase Dashboard: Authentication → Providers → Email → disable "Confirm email"
      // to auto-confirm all signups. Or deploy the auto-confirm-user edge function and invoke it here.
      try {
        await supabase.functions.invoke('auto-confirm-user', {
          body: { userId: authData.user.id },
        });
      } catch (_) {
        // Ignore if edge function not deployed or fails
      }

      // Check if session exists for correct redirect
      const { data: sessionCheck } = await supabase.auth.getSession();
      if (!sessionCheck.session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          console.error('Signup Error: Sign-in after signup failed:', signInError);
          return { data: authData, error: { message: 'Account created, but sign-in failed: ' + signInError.message } };
        }
      }

      return { data: authData, error: null };
    } catch (err) {
      console.error('Signup error:', err);
      return { data: null, error: err };
    }
  };

  const signIn = async ({ email, password }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.error('Login error:', err);
      return { data: null, error: err };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (err) {
      console.error('Logout error:', err);
      return { error: err };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
