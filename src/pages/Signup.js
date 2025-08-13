// src/pages/Signup.js
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiUser, FiHome, FiMapPin, FiPhone, FiMail, FiLock,
  FiGrid, FiPlus, FiTrash2, FiCamera, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import './Signup.css';
import { useAuth } from '../contexts/AuthContext';

// small map to auto-fill country from dialing code
const CC_TO_COUNTRY = {
  '+91': 'India',
  '+1': 'United States',
  '+44': 'United Kingdom',
  '+61': 'Australia',
  '+81': 'Japan',
  '+971': 'United Arab Emirates',
};

const uniqueKey = (s) => (s || '').trim().toLowerCase();

export default function Signup() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // ── Role
  const [role, setRole] = useState('user'); // 'user' | 'admin' | 'superadmin'

  // ── Core profile (sheet order)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [mobile, setMobile] = useState('');
  const [country, setCountry] = useState('India');
  const [pincode, setPincode] = useState('');
  const [house, setHouse] = useState('');   // House / Building
  const [street, setStreet] = useState(''); // Street
  const [city, setCity] = useState('');     // auto on pincode
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ── Weight profile (User/Admin only)
  const [height, setHeight] = useState('');
  const [heightUnit, setHeightUnit] = useState('cm'); // 'cm' | 'inch'
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg'); // 'kg' | 'lb'
  const [waist, setWaist] = useState('');
  const [waistUnit, setWaistUnit] = useState('cm');   // 'cm' | 'inch'
  const [dob, setDob] = useState('');                 // OR age
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');           // 'female' | 'male' | 'undisclosed' | ''

  // ── Devices (User/Admin; superadmin has separate assign area later)
  const [deviceIdInput, setDeviceIdInput] = useState('');
  const [allotToInput, setAllotToInput] = useState('');
  const [devices, setDevices] = useState([]); // [{ id, allotTo }]
  const [gridX, setGridX] = useState(3);
  const [gridY, setGridY] = useState(2);
  const [seriesIndex, setSeriesIndex] = useState(0);

  // ── Super Admin extras
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhoneCC, setCompanyPhoneCC] = useState('+91');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyCountry, setCompanyCountry] = useState('India');
  const [companyPincode, setCompanyPincode] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [sendInfoTo, setSendInfoTo] = useState('');

  // ── UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // auto country from dialing code
  useEffect(() => {
    setCountry(CC_TO_COUNTRY[countryCode] || '');
  }, [countryCode]);

  // auto country for superadmin's company block
  useEffect(() => {
    setCompanyCountry(CC_TO_COUNTRY[companyPhoneCC] || '');
  }, [companyPhoneCC]);

  // auto role “admin” if >1 device
  useEffect(() => {
  if (role === 'user' && devices.length > 1) {
    setRole('admin');
    setInfo('More than one device added — role switched to Admin.');
  } else if (info && (role !== 'user' || devices.length <= 1)) {
    setInfo('');
  }
}, [devices, role, info]);

  // clean 0-prefix from mobile on blur
  const cleanedMobile = useMemo(() => mobile.replace(/^0+/, ''), [mobile]);
  const handleMobileBlur = () => setMobile((m) => m.replace(/^0+/, ''));

  // pincode → city (simple helper; keep manual if fails)
  const handlePincodeBlur = async () => {
    const pin = (pincode || '').trim();
    if (pin.length < 4) return;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pin)}`);
      const json = await res.json();
      const office = json?.[0]?.PostOffice?.[0];
      if (office?.District) setCity(office.District);
    } catch {
      /* keep manual */
    }
  };

  const handleCompanyPincodeBlur = async () => {
    const pin = (companyPincode || '').trim();
    if (pin.length < 4) return;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${encodeURIComponent(pin)}`);
      const json = await res.json();
      const office = json?.[0]?.PostOffice?.[0];
      if (office?.District) setCompanyCity(office.District);
    } catch {
      /* keep manual */
    }
  };

  // ── devices
  const totalSlots = gridX * gridY;
  const pagedDevices = useMemo(() => devices.slice(0, totalSlots), [devices, totalSlots]);

  const stepSeries = (dir) => {
    setSeriesIndex((i) => {
      const next = i + dir;
      if (next < 0) return Math.max(0, pagedDevices.length - 1);
      if (next >= pagedDevices.length) return 0;
      return next;
    });
  };

  const addDevice = () => {
    setError('');
    const id = deviceIdInput.trim();
    const allot = allotToInput.trim();
    if (!id) return setError('Enter Device ID');
    if (!allot) return setError('Enter "Allot device to (User)"');
    const key = uniqueKey(allot);
    if (devices.some((d) => uniqueKey(d.allotTo) === key)) {
      return setError('Allot-to code must be unique.');
    }
    setDevices((prev) => [...prev, { id, allotTo: allot }]);
    setDeviceIdInput('');
    setAllotToInput('');
  };

  const removeDevice = (idx) => {
    setDevices((prev) => prev.filter((_, i) => i !== idx));
    setSeriesIndex(0);
  };

  // Only the fields that are truly mandatory in the spec
  const checkRequired = () => {
    const missing = [];

    if (!firstName?.trim()) missing.push("First name");
    if (!email?.trim()) missing.push("Email");
    if (!password?.trim()) missing.push("Password");
    if (!confirmPassword?.trim()) missing.push("Confirm Password");
    if (!pincode?.trim()) missing.push("Pincode");

    if (password && confirmPassword && password !== confirmPassword) {
      return "Passwords do not match";
    }
    return missing.length ? `Missing: ${missing.join(", ")}` : "";
  };


  // ── submit
  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const validationMsg = checkRequired();
    if (validationMsg) {
      setError(validationMsg);
      return;
    }
    

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    // Build sheet-aligned payload
    const name = [firstName, lastName].filter(Boolean).join(' ').trim();
    const address = [house, street].filter(Boolean).join(', ');

    const weightProfile =
      role !== 'superadmin'
        ? {
          height: height ? Number(height) : undefined,
          heightUnit,
          weight: weight ? Number(weight) : undefined,
          weightUnit,
          waist: waist ? Number(waist) : undefined,
          waistUnit,
          dob: dob || undefined,
          age: age ? Number(age) : undefined,
          gender: gender || undefined,
        }
        : undefined;

    const requestData = {
      name,
      organizationName: orgName || undefined,
      email,
      countryCode,
      mobile: cleanedMobile,
      country,
      pincode,
      address,
      city,
      password,
      role,
      devices: devices.length ? devices : undefined,
      grid: devices.length && role === 'admin' ? { x: Number(gridX), y: Number(gridY) } : undefined,
      weightProfile,
      signupMeta: { source: 'web', version: 'v1' },
      // Super Admin extras:
      addCompany:
        role === 'superadmin'
          ? {
            name: companyName || undefined,
            email: companyEmail || undefined,
            phoneCC: companyPhoneCC,
            phone: companyPhone || undefined,
            country: companyCountry || undefined,
            pincode: companyPincode || undefined,
            city: companyCity || undefined,
            address: companyAddress || undefined,
          }
          : undefined,
      sendInfoTo: role === 'superadmin' && sendInfoTo ? sendInfoTo : undefined,
    };


    setLoading(true);
    try {
      // Register
      const regRes = await fetch('https://admin.dozemate.com/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });
      const regJson = await regRes.json();
      if (!regRes.ok) throw new Error(regJson?.message || 'Registration failed');

      // Token (maybe returned)
      let token =
        (typeof regJson?.token === 'string' && regJson.token.trim()) ||
        (typeof regJson?.data?.token === 'string' && regJson.data.token.trim()) ||
        null;

      // Login if needed
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

      if (!token) {
        localStorage.removeItem('token');
        navigate('/login', { replace: true, state: { fromSignup: true } });
        return;
      }

      // Fetch profile
      const meRes = await fetch('https://admin.dozemate.com/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meJson = await meRes.json();
      if (!meRes.ok) throw new Error(meJson?.message || 'Failed to fetch profile');

      const user = meJson?.data || meJson?.user || meJson;
      const resolvedRole = user?.role || role || 'user';

      // Persist & route
      login(token, user, resolvedRole);
      let redirect = '/dashboard';
      if (resolvedRole === 'admin') redirect = '/admin/dashboard';
      if (resolvedRole === 'superadmin') redirect = '/superadmin/dashboard';
      navigate(redirect, { replace: true });
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const showWeightProfile = role !== 'superadmin';
  const showAdminGrid = role === 'admin';

  return (
    <div className="signup-container">
      <div className="auth-card-signup">
        <h1 className="app-title">
          <span className="logo-gradient">Dozemate</span>
        </h1>

        <form onSubmit={handleSignup} className="signup-form">
          {/* Role selector */}
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
              <input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="input-container">
              <FiUser className="input-icon" />
              <input
                type="text"
                placeholder="Last name (optional)"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          {/* Org name (optional) */}
          <div className="input-container">
            <FiGrid className="input-icon" />
            <input
              type="text"
              placeholder="Organization name (optional)"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>

          {/* Mail id */}
          <div className="input-container">
            <FiMail className="input-icon" />
            <input
              type="email"
              placeholder="Mail id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Country code + Mobile */}
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
                placeholder="Mobile number (we will remove leading 0s)"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                onBlur={handleMobileBlur}
                required
              />
            </div>
          </div>

          {/* Country (auto) */}
          <div className="input-container">
            <FiMapPin className="input-icon" />
            <input
              type="text"
              placeholder="Country (auto fill on phone code above)"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            />
          </div>

          {/* Pincode + City */}
          <div className="row-2">
            <div className="input-container">
              <FiMapPin className="input-icon" />
              <input
                type="text"
                placeholder="Pincode (mandatory)"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                onBlur={handlePincodeBlur}
                required
              />
            </div>
            <div className="input-container">
              <FiMapPin className="input-icon" />
              <input
                type="text"
                placeholder="City (auto on pincode, editable)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          {/* Address */}
          <div className="input-container">
            <FiHome className="input-icon" />
            <input
              type="text"
              placeholder="House / Building (optional)"
              value={house}
              onChange={(e) => setHouse(e.target.value)}
            />
          </div>
          <div className="input-container">
            <FiHome className="input-icon" />
            <input
              type="text"
              placeholder="Street (optional)"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
          </div>

          {/* Passwords */}
          <div className="row-2">
            <div className="input-container">
              <FiLock className="input-icon" />
              <input
                type="password"
                placeholder="Create Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="input-container">
              <FiLock className="input-icon" />
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Optional data for weight profile (User/Admin only) */}
          {role !== 'superadmin' && (
            <>
              <div className="section-title" style={{ marginTop: 8 }}>
                Optional data for weight profile
              </div>

              <div className="row-3">
                <div className="input-container">
                  <input
                    type="number"
                    placeholder="Height"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                  />
                  <select
                    value={heightUnit}
                    onChange={(e) => setHeightUnit(e.target.value)}
                    className="unit-select"
                    aria-label="Height unit"
                  >
                    <option value="cm">cm</option>
                    <option value="inch">inch</option>
                  </select>
                </div>

                <div className="input-container">
                  <input
                    type="number"
                    placeholder="Weight"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                  <select
                    value={weightUnit}
                    onChange={(e) => setWeightUnit(e.target.value)}
                    className="unit-select"
                    aria-label="Weight unit"
                  >
                    <option value="kg">kg</option>
                    <option value="lb">lbs</option>
                  </select>
                </div>

                <div className="input-container">
                  <input
                    type="number"
                    placeholder="Waist"
                    value={waist}
                    onChange={(e) => setWaist(e.target.value)}
                  />
                  <select
                    value={waistUnit}
                    onChange={(e) => setWaistUnit(e.target.value)}
                    className="unit-select"
                    aria-label="Waist unit"
                  >
                    <option value="cm">cm</option>
                    <option value="inch">inch</option>
                  </select>
                </div>
              </div>

              <div className="row-3">
                <div className="input-container">
                  <input
                    type="date"
                    placeholder="DOB"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>
                <div className="input-container">
                  <input
                    type="number"
                    placeholder="Age (years)"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
                <div className="input-container">
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="text-input"
                  >
                    <option value="">Gender</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="undisclosed">Undisclosed</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Device Details (User/Admin) */}
          {(role === 'user' || role === 'admin') && (
            <>
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

                  {role === 'admin' && (
                    <>
                      <div className="section-title" style={{ marginTop: 18 }}>View devices</div>
                      <div className="row-2">
                        <div className="input-container">
                          <FiGrid className="input-icon" />
                          <input
                            type="number"
                            min="1"
                            value={gridX}
                            onChange={(e) => setGridX(Number(e.target.value || 1))}
                            placeholder="Grid X"
                          />
                        </div>
                        <div className="input-container">
                          <FiGrid className="input-icon" />
                          <input
                            type="number"
                            min="1"
                            value={gridY}
                            onChange={(e) => setGridY(Number(e.target.value || 1))}
                            placeholder="Grid Y"
                          />
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
                </>
              )}
            </>
          )}

          {/* Super Admin extras */}
          {role === 'superadmin' && (
            <>
              <div className="section-title" style={{ marginTop: 16 }}>
                Add Company (optional)
              </div>

              <div className="input-container">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  placeholder="Name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div className="input-container">
                <FiMail className="input-icon" />
                <input
                  type="email"
                  placeholder="Mail id"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                />
              </div>

              <div className="phone-row">
                <div className="input-container select">
                  <select
                    value={companyPhoneCC}
                    onChange={(e) => setCompanyPhoneCC(e.target.value)}
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
                    placeholder="Phone"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-container">
                <FiMapPin className="input-icon" />
                <input
                  type="text"
                  placeholder="Country (auto fill on location)"
                  value={companyCountry}
                  onChange={(e) => setCompanyCountry(e.target.value)}
                />
              </div>

              <div className="row-2">
                <div className="input-container">
                  <FiMapPin className="input-icon" />
                  <input
                    type="text"
                    placeholder="Pin code (optional)"
                    value={companyPincode}
                    onChange={(e) => setCompanyPincode(e.target.value)}
                    onBlur={handleCompanyPincodeBlur}
                  />
                </div>
                <div className="input-container">
                  <FiMapPin className="input-icon" />
                  <input
                    type="text"
                    placeholder="City (auto fill on pin code)"
                    value={companyCity}
                    onChange={(e) => setCompanyCity(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-container">
                <FiHome className="input-icon" />
                <input
                  type="text"
                  placeholder="Address (optional)"
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                />
              </div>

              <div className="section-title" style={{ marginTop: 10 }}>Send information to</div>
              <div className="input-container">
                <FiMail className="input-icon" />
                <input
                  type="email"
                  placeholder="Send information to (email)"
                  value={sendInfoTo}
                  onChange={(e) => setSendInfoTo(e.target.value)}
                />
              </div>

              {/* Optional device allotment */}
              <div className="section-title">Device Details (optional)</div>
              <div className="row-3">
                <div className="input-container">
                  <FiGrid className="input-icon" />
                  <input
                    type="text"
                    placeholder="Enter Device ID (optional)"
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
                    placeholder='Allot device to (User) (type mail id to filter)'
                    value={allotToInput}
                    onChange={(e) => setAllotToInput(e.target.value)}
                  />
                </div>
              </div>

              <button type="button" className="btn-outline" onClick={addDevice}>
                <FiPlus style={{ marginRight: 6 }} /> OKAY
              </button>
            </>
          )}

          {info && <div className="info-message">{info}</div>}
          {error && <div className="error-message shake">{error}</div>}

          <button type="submit" className="signup-button hover-effect" disabled={loading}>
            {loading ? <span className="loading-spinner" /> : <span className="button-text">Create Account</span>}
          </button>

          <p className="login-link">
            Already have an account?{' '}
            <Link to="/login" className="link-gradient">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
