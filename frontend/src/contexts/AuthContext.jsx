import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

axios.defaults.withCredentials = true;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email, password) => {
    const response = await axios.post('/api/auth/signin', { email, password });
    setUser(response.data.user);
    return response.data;
  };

  const signUp = async (email, password, username, phone, profile_picture) => {
    const response = await axios.post('/api/auth/signup', { 
      email, 
      password, 
      username: username || null,
      phone: phone || null,
      profile_picture: profile_picture || null 
    });
    setUser(response.data.user);
    return response.data;
  };

  const signOut = async () => {
    await axios.post('/api/auth/signout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

