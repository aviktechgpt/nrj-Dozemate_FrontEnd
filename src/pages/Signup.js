import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiHome, FiMapPin, FiPhone, FiMail, FiLock, FiGrid } from 'react-icons/fi';
import './Signup.css';

const Signup = () => {
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

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    
    // Create request data - use 999999 as org ID if individual user is checked
    const requestData = {
      ...formData,
      organizationId: formData.isIndividual ? "999999" : formData.organizationId
    };
    
    // Remove confirmPassword and isIndividual from the request
    delete requestData.confirmPassword;
    delete requestData.isIndividual;

    try {
      const response = await fetch('https://admin.dozemate.com/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Signup failed');

      // Store JWT token
      localStorage.setItem('token', data.token);
      
      // Redirect to dashboard after a slight delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err.message);
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
            <input type="tel" name="mobile" placeholder="Mobile Number" onChange={handleChange} required />
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