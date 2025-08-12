import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiHome, FiMapPin, FiPhone, FiMail, FiLock, FiGrid } from 'react-icons/fi';
import './Signup.css';
import { useAuth } from "../contexts/AuthContext"; // adjust path if needed


const Signup = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    pincode: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationId: '',
    isIndividual: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleMobileBlur = (e) => {
    const cleaned = e.target.value.replace(/^0+/, '');
    setFormData(prev => ({ ...prev, mobile: cleaned }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const sanitizedMobile = formData.mobile.replace(/^0+/, '');
      const requestData = {
        ...formData,
        mobile: sanitizedMobile,
        organizationId: formData.isIndividual ? "999999" : formData.organizationId,
      };
      delete requestData.confirmPassword;
      delete requestData.isIndividual;

      // 1) Register
      const regRes = await fetch('https://admin.dozemate.com/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const regJson = await regRes.json();
      if (!regRes.ok) {
        throw new Error(regJson?.message || 'Registration failed');
      }
      console.log('register response:', regJson);

      // 2) Get token (if register returns one)
      let token =
        (typeof regJson?.token === 'string' && regJson.token.trim()) ||
        (typeof regJson?.data?.token === 'string' && regJson.data.token.trim()) ||
        null;

      // 3) If no token, login with same credentials
      if (!token) {
        const loginRes = await fetch('https://admin.dozemate.com/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, password: formData.password }),
        });

        const loginJson = await loginRes.json();
        if (!loginRes.ok) {
          throw new Error(loginJson?.message || 'Login after register failed (maybe verification required)');
        }

        token =
          (typeof loginJson?.token === 'string' && loginJson.token.trim()) ||
          (typeof loginJson?.data?.token === 'string' && loginJson.data.token.trim()) ||
          null;
      }

      // 4) If still no token, send to login page
      if (!token) {
        localStorage.removeItem('token');
        navigate('/login', { replace: true, state: { fromSignup: true } });
        return;
      }

      // 5) Fetch profile
      const meRes = await fetch('https://admin.dozemate.com/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meJson = await meRes.json();
      if (!meRes.ok) {
        throw new Error(meJson?.message || 'Failed to fetch profile');
      }
      const user = meJson?.data || meJson?.user || meJson;
      const role = user?.role || 'user';

      // 6) Persist auth and go to dashboard
      login(token, user, role);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  return (
    <div className="signup-container">
      <div className="auth-card-signup">
        <h1 className="app-title">
          <span className="logo-gradient">Dozemate</span>
        </h1>

        <form onSubmit={handleSignup} className="signup-form">
          <div className="input-container">
            <FiUser className="input-icon" />
            <input type="text" name="name" placeholder="Name" onChange={handleChange} required />
          </div>

          <div className="input-container">
            <FiHome className="input-icon" />
            <input type="text" name="address" placeholder="Address" onChange={handleChange} required />
          </div>

          <div className="input-container">
            <FiMapPin className="input-icon" />
            <input type="text" name="pincode" placeholder="Pincode" onChange={handleChange} required />
          </div>

          <div className="input-container">
            <FiPhone className="input-icon" />
            <input type="tel" name="mobile" placeholder="Mobile Number"
              value={formData.mobile} onBlur={handleMobileBlur} onChange={handleChange} required />
          </div>

          <div className="input-container">
            <FiMail className="input-icon" />
            <input type="email" name="email" placeholder="Email" onChange={handleChange} required />
          </div>

          <div className="input-container">
            <FiLock className="input-icon" />
            <input type="password" name="password" placeholder="Create Password" onChange={handleChange} required />
          </div>

          <div className="input-container">
            <FiLock className="input-icon" />
            <input type="password" name="confirmPassword" placeholder="Confirm Password" onChange={handleChange} required />
          </div>

          <div className="input-container">
            <FiGrid className="input-icon" />
            <input
              type="text"
              name="organizationId"
              placeholder="Organization ID"
              onChange={handleChange}
              disabled={formData.isIndividual}
              required={!formData.isIndividual}
            />
          </div>

          <div className="checkbox-container">
            <input
              type="checkbox"
              name="isIndividual"
              id="isIndividual"
              checked={formData.isIndividual}
              onChange={handleChange}
            />
            <label htmlFor="isIndividual">I am an individual user</label>
          </div>

          {error && <div className="error-message shake">{error}</div>}

          <button type="submit" className="signup-button hover-effect" disabled={loading}>
            {loading ? <span className="loading-spinner"></span> : <span className="button-text">Create Account</span>}
          </button>

          <p className="login-link">
            Already have an account? <Link to="/login" className="link-gradient">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Signup;