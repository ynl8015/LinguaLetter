import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import { apolloClient } from './lib/apollo';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Teacher from './pages/Teacher';
import Dashboard from './pages/Dashboard';
import News from './pages/News';
import Subscription from './pages/Subscription';
import AuthCallback from './pages/AuthCallback';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import NewsAdmin from './pages/NewsAdmin';

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <ApolloProvider client={apolloClient}>
        <AuthProvider>
          <Router>
            <div className="App">
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/teacher" element={<Teacher />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/news" element={<News />} />
                <Route path="/subscription" element={<Subscription />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/admin/news" element={<NewsAdmin />} />
              </Routes>
            </div>
          </Router>
        </AuthProvider>
      </ApolloProvider>
    </GoogleOAuthProvider>
  );
}

export default App;