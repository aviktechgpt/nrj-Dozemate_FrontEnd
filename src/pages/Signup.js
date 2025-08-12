import React, { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiUser, FiHome, FiMapPin, FiPhone, FiMail, FiLock, FiGrid, FiPlus, FiTrash2, FiCamera, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import './Signup.css';
import { useAuth } from "../contexts/AuthContext";

// very small map to auto-fill country from code (extend as needed)
const CC_TO_COUNTRY = {
  '+91': 'India',
  '+1': 'United States',
  '+44': 'United Kingdom',
  '+61': 'Australia',
  '+81': 'Japan',
};

const uniqueKey = (s) => (s || '').trim().toLowerCase();

const Signup = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  // ── Account & profile fields
  const [role, setRole] = useState('user'); // user | admin | superadmin
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [orgId, setOrgId] = useState('');
  const [isIndividual, setIsIndividual] = useState(false);
  // Address / phone
  const [house, setHouse] = useState('');       // house / building (optional)
  const [street, setStreet] = useState('');     // optional
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');         // auto from pincode (optional)
  const [countryCode, setCountryCode] = useState('+91');
  const [mobile, setMobile] = useState('');     // digits only; strip leading 0’s on blur
  const [country, setCountry] = useState('India'); // auto from code

  // ── Device onboarding (admin sheet)
  const [deviceIdInput, setDeviceIdInput] = useState('');
  const [allotToInput, setAllotToInput] = useState(''); // “Text + number” (must be unique)
  const [devices, setDevices] = useState([]);   // [{id, allotTo}]
  const [gridX, setGridX] = useState(3);
  const [gridY, setGridY] = useState(2);
  const [seriesIndex, setSeriesIndex] = useState(0);

  // generic UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // auto country from dialing code
  useEffect(() => {
    setCountry(CC_TO_COUNTRY[countryCode] || '');
  }, [countryCode]);

  // auto role “admin” if more than one device
  useEffect(() => {
    if (devices.length > 1 && role !== 'admin') {
      setRole('admin');
      setInfo('More than one device added — role switched to Admin.');
    } else if (devices.length <= 1 && info) {
      setInfo('');
    }
  }, [devices, role, info]);

  const cleanedMobile = useMemo(() => mobile.replace(/^0+/, ''), [mobile]);

  const handleMobileBlur = () => {
    setMobile(prev => prev.replace(/^0+/, ''));
  };

  // basic pincode → city (India public API). If you don’t want a live call, keep field manual.
  const handlePincodeBlur = async () => {
    const pin = (pincode || '').trim();
    if (pin.length < 4) return;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pin)}`);
      const json = await res.json();
      const office = json?.[0]?.PostOffice?.[0];
      if (office?.District) setCity(office.District);
    } catch {
      /* ignore: keep manual typing */
    }
  };

  // ── device add/remove
  const addDevice = async () => {
    setError('');
    const id = deviceIdInput.trim();
    const allot = allotToInput.trim();
    if (!id) return setError('Enter Device ID');
    if (!allot) return setError('Enter "Allot to (User)"');

    // enforce unique allot code
    const key = uniqueKey(allot);
    if (devices.some(d => uniqueKey(d.allotTo) === key)) {
      return setError('Allot-to code must be unique.');
    }

    // (Optional) validate with backend BEFORE adding
    // try {
    //   const r = await fetch(`https://admin.dozemate.com/api/device/validate?deviceId=${encodeURIComponent(id)}`);
    //   if (!r.ok) throw new Error('Device not found/available');
    // } catch (e) { return setError(e.message); }

    setDevices(prev => [...prev, { id, allotTo: allot }]);
    setDeviceIdInput('');
    setAllotToInput('');
  };

  const removeDevice = (idx) => {
    setDevices(prev => prev.filter((_, i) => i !== idx));
    setSeriesIndex(0);
  };

  const totalSlots = gridX * gridY;
  const pagedDevices = useMemo(() => {
    // show at most X*Y in preview, highlight “seriesIndex”
    return devices.slice(0, totalSlots);
  }, [devices, totalSlots]);

  const stepSeries = (dir) => {
    setSeriesIndex(i => {
      const next = i + dir;
      if (next < 0) return Math.max(0, pagedDevices.length - 1);
      if (next >= pagedDevices.length) return 0;
      return next;
    });
  };

  // ── submit
  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    if (!isIndividual && !orgId.trim()) {
      setError('Please enter Organization ID or mark as Individual.');
      return;
    }
    setLoading(true);
    try {
      // Build “name” that your API already expects
      const name = [firstName, lastName].filter(Boolean).join(' ').trim();
      const address = [house, street].filter(Boolean).join(', ');

      const requestData = {
        // existing fields
        name,
        address,
        pincode,
        mobile: cleanedMobile,
        email,
        password,
        organizationName: orgName || undefined,
        role, // NEW: user | admin | superadmin 
        organizationId: isIndividual ? '999999' : orgId.trim(),
        countryCode,
        country,
        city,
        signupMeta: {
          source: 'web',
          version: 'v1',
        },
        // devices + grid from spec
        devices,                             // [{ id, allotTo }]
        grid: { x: Number(gridX), y: Number(gridY) },
      };

      // --- 1) Register
      const regRes = await fetch('https://admin.dozemate.com/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });
      const regJson = await regRes.json();
      if (!regRes.ok) throw new Error(regJson?.message || 'Registration failed');

      // --- 2) Token (maybe in register)
      let token =
        (typeof regJson?.token === 'string' && regJson.token.trim()) ||
        (typeof regJson?.data?.token === 'string' && regJson.data.token.trim()) ||
        null;

      // --- 3) If no token, login
      if (!token) {
        const loginRes = await fetch('https://admin.dozemate.com/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role }),
        });
        const loginJson = await loginRes.json();
        if (!loginRes.ok) throw new Error(loginJson?.message || 'Login after register failed');

        token =
          (typeof loginJson?.token === 'string' && loginJson.token.trim()) ||
          (typeof loginJson?.data?.token === 'string' && loginJson.data.token.trim()) ||
          null;
      }

      // --- 4) If still no token, send to login
      if (!token) {
        localStorage.removeItem('token');
        navigate('/login', { replace: true, state: { fromSignup: true } });
        return;
      }

      // --- 5) Fetch profile
      const meRes = await fetch('https://admin.dozemate.com/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meJson = await meRes.json();
      if (!meRes.ok) throw new Error(meJson?.message || 'Failed to fetch profile');
      const user = meJson?.data || meJson?.user || meJson;
      const resolvedRole = user?.role || role || 'user';

      // --- 6) Persist auth and route by role
      login(token, user, resolvedRole);

      let redirect = '/dashboard';
      if (resolvedRole === 'admin') redirect = '/admin/dashboard';
      if (resolvedRole === 'superadmin') redirect = '/superadmin/dashboard';
      navigate(redirect, { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="auth-card-signup">
        <h1 className="app-title">
          <span className="logo-gradient">Dozemate</span>
        </h1>

        <form onSubmit={handleSignup} className="signup-form">

          {/* Role selector per requirement */}
          <div className="input-container">
            <FiUser className="input-icon" />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="text-input"
              aria-label="Select role"
              disabled={devices.length > 1} // auto-admin rule
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>

          {/* Names */}
          <div className="row-2">
            <div className="input-container">
              <FiUser className="input-icon" />
              <input type="text" placeholder="First name" value={firstName}
                onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="input-container">
              <FiUser className="input-icon" />
              <input type="text" placeholder="Last name" value={lastName}
                onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          {/* Organization */}
          <div className="input-container">
            <FiGrid className="input-icon" />
            <input type="text" placeholder="Organization name"
              value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          </div>
          {/* Organization ID + Individual toggle */}
          <div className="row-2">
            <div className="input-container">
              <FiGrid className="input-icon" />
              <input
                type="text"
                placeholder="Organization ID"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                disabled={isIndividual}
                required={!isIndividual}
              />
            </div>

            <label className="checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={isIndividual}
                onChange={(e) => setIsIndividual(e.target.checked)}
              />
              I am an individual user (uses Org ID 999999)
            </label>
          </div>

          {/* Address split */}
          <div className="input-container">
            <FiHome className="input-icon" />
            <input type="text" placeholder="House / Building (optional)"
              value={house} onChange={(e) => setHouse(e.target.value)} />
          </div>

          <div className="input-container">
            <FiHome className="input-icon" />
            <input type="text" placeholder="Street (optional)"
              value={street} onChange={(e) => setStreet(e.target.value)} />
          </div>

          <div className="row-2">
            <div className="input-container">
              <FiMapPin className="input-icon" />
              <input type="text" placeholder="Pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                onBlur={handlePincodeBlur}
                required />
            </div>
            <div className="input-container">
              <FiMapPin className="input-icon" />
              <input type="text" placeholder="City (auto on pincode, editable)"
                value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>

          {/* Phone (country code + number) */}
          <div className="phone-row">
            <div className="input-container select">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                aria-label="Country code"
              >
                <option value="+91">+91 India</option>
                <option value="+1">+1 United States</option>
                <option value="+44">+44 United Kingdom</option>
                <option value="+61">+61 Australia</option>
                <option value="+81">+81 Japan</option>
                <option value="+971">+971 UAE</option>
              </select>
            </div>

            <div className="input-container">
              <FiPhone className="input-icon" />
              <input
                type="tel"
                placeholder="Mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                onBlur={handleMobileBlur}
                required
              />
            </div>
          </div>

          <div className="input-container">
            <FiMapPin className="input-icon" />
            <input type="text" placeholder="Country (auto from code, editable)"
              value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>

          {/* Email & password */}
          <div className="input-container">
            <FiMail className="input-icon" />
            <input type="email" placeholder="Email"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="row-2">
            <div className="input-container">
              <FiLock className="input-icon" />
              <input type="password" placeholder="Create Password"
                value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="input-container">
              <FiLock className="input-icon" />
              <input type="password" placeholder="Confirm Password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
          </div>

          {/* ───────────────── Devices (spreadsheet block) */}
          <div className="section-title">Device Details</div>

          <div className="row-3">
            <div className="input-container">
              <FiGrid className="input-icon" />
              <input
                type="text"
                placeholder="Enter Device ID"
                value={deviceIdInput}
                onChange={(e) => setDeviceIdInput(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn-secondary"
              title="Scan device (QR/Barcode)"
              onClick={() => alert('Scanner placeholder – integrate react-qr-reader or similar')}
            >
              <FiCamera style={{ marginRight: 6 }} /> Scan device
            </button>

            <div className="input-container">
              <FiUser className="input-icon" />
              <input
                type="text"
                placeholder='Allot device to (User) e.g. "user-1"'
                value={allotToInput}
                onChange={(e) => setAllotToInput(e.target.value)}
              />
            </div>
          </div>

          <button type="button" className="btn-outline" onClick={addDevice}>
            <FiPlus style={{ marginRight: 6 }} /> OKAY (Add device)
          </button>

          {!!devices.length && (
            <>
              <div className="muted" style={{ marginTop: 10 }}>
                {devices.length > 1
                  ? 'More than one device is added — this account will be Admin.'
                  : 'Add more than one device to make this account Admin automatically.'}
              </div>

              <div className="section-title" style={{ marginTop: 18 }}>View devices</div>

              <div className="row-2">
                <div className="input-container">
                  <FiGrid className="input-icon" />
                  <input type="number" min="1" value={gridX}
                    onChange={(e) => setGridX(Number(e.target.value || 1))}
                    placeholder="Grid X" />
                </div>
                <div className="input-container">
                  <FiGrid className="input-icon" />
                  <input type="number" min="1" value={gridY}
                    onChange={(e) => setGridY(Number(e.target.value || 1))}
                    placeholder="Grid Y" />
                </div>
              </div>

              <div
                className="devices-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${gridX}, minmax(0, 1fr))`,
                  gap: '8px',
                }}
              >
                {Array.from({ length: gridX * gridY }).map((_, idx) => {
                  const d = pagedDevices[idx];
                  const isActive = idx === seriesIndex;
                  return (
                    <div key={idx} className={`grid-cell ${isActive ? 'active' : ''}`}>
                      {d ? (
                        <>
                          <div className="cell-title">{d.id}</div>
                          <div className="cell-sub">→ {d.allotTo}</div>
                          <button
                            type="button"
                            className="icon-btn"
                            title="Remove"
                            onClick={() => removeDevice(idx)}
                          >
                            <FiTrash2 />
                          </button>
                        </>
                      ) : (
                        <div className="cell-empty">Empty</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="row-2" style={{ justifyContent: 'space-between', marginTop: 10 }}>
                <button type="button" className="btn-secondary" onClick={() => stepSeries(-1)}>
                  <FiChevronLeft style={{ marginRight: 6 }} /> Series Prev
                </button>
                <button type="button" className="btn-secondary" onClick={() => stepSeries(1)}>
                  Series Next <FiChevronRight style={{ marginLeft: 6 }} />
                </button>
              </div>
            </>
          )}

          {info && <div className="info-message">{info}</div>}
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
