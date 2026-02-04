import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Books from './pages/Books';
import PagesList from './pages/PagesList';
import EditorPage from './pages/EditorPage';
import Settings from './pages/Settings';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Header from './components/Header';
import ToastProvider from './components/ToastProvider';

function AuthGuard({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return children;
}

function Layout() {
  const location = useLocation();
  const showHeader = location.pathname !== '/' && location.pathname !== '/signin' && location.pathname !== '/signup';

  return (
    <>
      {showHeader && <Header />}
      <AppRoutes />
    </>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route
        path="/signin"
        element={user ? <Navigate to="/books" replace /> : <SignIn />}
      />
      <Route
        path="/signup"
        element={user ? <Navigate to="/books" replace /> : <SignUp />}
      />
      <Route
        path="/books"
        element={
          <AuthGuard>
            <Books />
          </AuthGuard>
        }
      />
      <Route
        path="/books/:bookName/pages"
        element={
          <AuthGuard>
            <PagesList />
          </AuthGuard>
        }
      />
      <Route
        path="/books/:bookName/pages/:pageName"
        element={
          <AuthGuard>
            <EditorPage />
          </AuthGuard>
        }
      />
      <Route
        path="/settings"
        element={
          <AuthGuard>
            <Settings />
          </AuthGuard>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50">
            <Layout />
          </div>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;

