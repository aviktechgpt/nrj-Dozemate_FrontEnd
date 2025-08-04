import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiLock, FiMail, FiChevronDown } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://admin.dozemate.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Login failed');

      // Store token and user data using auth context
      await login(data.token, data.user, role);

      // Small delay to ensure auth context is updated
      await new Promise(resolve => setTimeout(resolve, 100));

      // Determine redirect path based on role
      let redirectPath = '/dashboard';
      if (role === 'admin') {
        redirectPath = '/admin/dashboard';
      } else if (role === 'superadmin') {
        redirectPath = '/superadmin/dashboard';
      }

      // Navigate immediately after successful login
      navigate(redirectPath, { replace: true });
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="auth-card">
        <h1 className="app-title">
          <span className="logo-gradient">Dozemate</span>
        </h1>

        <form onSubmit={handleLogin} className="login-form">
          <div className="role-select-container">
            <FiUser className="input-icon" />
            <select value={role} onChange={(e) => setRole(e.target.value)} className="role-select">
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
            <FiChevronDown className="select-arrow" />
          </div>

          <div className="input-container">
            <FiMail className="input-icon" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-container">
            <FiLock className="input-icon" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="error-message shake">{error}</div>}

          <button type="submit" className="login-button hover-effect" disabled={loading}>
            {loading ? (
              <div className="loading-spinner"></div>
            ) : (
              <span className="button-text">Login</span>
            )}
          </button>

          <p className="signup-link">
            Don't have an account? <Link to="/signup" className="link-gradient">Sign Up</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;