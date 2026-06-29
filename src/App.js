import React, { useState, useEffect } from 'react';

function App() {
  // 🟢 LIVE CLOUD ENDPOINT ROUTE
  const API_URL = "https://app-58ad83c3-9374-408d-a591-e7934f8cf878.cleverapps.io/ApplicationController";

  const [view, setView] = useState('welcome'); 
  const [authMode, setAuthMode] = useState('login'); 
  
  const [currentUser, setCurrentUser] = useState(null); 
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [showNotice, setShowNotice] = useState(false);

  // Auth inputs
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authNationality, setAuthNationality] = useState('');

  // Visa inputs
  const [data, setData] = useState({ fullName: '', passportNum: '', nationality: '' });
  const [dashboardView, setDashboardView] = useState('new-app'); 
  
  // Public tracking lookup states
  const [publicPassport, setPublicPassport] = useState('');
  const [publicTrackedRecord, setPublicTrackedRecord] = useState(null);
  const [hasSearchedPublic, setHasTrackedPublic] = useState(false);

  // Data streams
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errors, setErrors] = useState({});

  // Admin controls
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVisa, setSelectedVisa] = useState(null);

  // Modern High-Contrast Core Palette
  const colors = {
    bg: '#F8FAFC',            
    sidebarBg: '#0F172A',     
    sidebarText: '#F1F5F9',   
    cardBg: '#FFFFFF',        
    textMain: '#0F172A',      
    textMuted: '#475569',
    accent: '#2563EB',        
    border: '#E2E8F0',        
    buttonBg: '#0F172A',      
    buttonHover: '#1E40AF',   
    bgPending: '#FEF3C7', colorPending: '#D97706', 
    bgApproved: '#D1FAE5', colorApproved: '#059669', 
    bgRejected: '#FEE2E2', colorRejected: '#DC2626', 
    error: '#EF4444',
    noticeBg: '#EFF6FF', noticeText: '#1E40AF'
  };

  const navigateTo = (newView) => {
    setView(newView);
    window.history.pushState({ view: newView }, '', '/' + newView);
  };

  useEffect(() => {
    if (!window.history.state) {
      window.history.replaceState({ view: 'welcome' }, '', '/welcome');
    } else if (window.history.state.view) {
      setView(window.history.state.view);
    }

    const handleBrowserNavigation = (event) => {
      if (event.state && event.state.view) {
        setView(event.state.view);
      } else {
        setView('welcome');
      }
    };

    window.addEventListener('popstate', handleBrowserNavigation);
    return () => window.removeEventListener('popstate', handleBrowserNavigation);
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        const resData = await response.json();
        setApplications(resData);
        return resData;
      }
    } catch (error) {
      console.error(error);
    }
    return [];
  };

  useEffect(() => {
    if (isAdminLoggedIn || currentUser || view === 'public-track') {
      fetchApplications();
    }
  }, [view, isAdminLoggedIn, currentUser]);

  const validateForm = () => {
    let tempErrors = {};
    const passportRegex = /^[A-Z0-9]{6,12}$/i;
    const nameRegex = /^[a-zA-Z\s]{3,40}$/;

    if (!nameRegex.test(data.fullName)) tempErrors.fullName = "Letters only (3-40 characters).";
    if (!passportRegex.test(data.passportNum)) tempErrors.passportNum = "Alphanumeric required (6-12 characters).";
    if (!data.nationality.trim()) tempErrors.nationality = "Nationality is required.";

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'lodgeApplication',
          fullName: data.fullName,
          passportNum: data.passportNum,
          nationality: data.nationality
        })
      });
      if (response.ok) {
        alert("Application Submitted Successfully!");
        setData({ fullName: currentUser.fullName, passportNum: '', nationality: currentUser.nationality });
        setErrors({});
        setShowNotice(false);
        fetchApplications();
        setDashboardView('my-apps'); 
      }
    } catch (error) {
      alert("Server processing error.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ action: 'updateStatus', id: id.toString(), status: newStatus })
      });
      if (response.ok) {
        setApplications(prev => prev.map(app => app.id === id ? { ...app, status: newStatus } : app));
      }
    } catch (error) {
      alert("Error updating database row status.");
    }
  };

  const handlePublicTrack = async (e) => {
    e.preventDefault();
    setLoading(true);
    const freshData = await fetchApplications();
    const match = freshData.find(app => app.passportNum.trim().toLowerCase() === publicPassport.trim().toLowerCase());
    setPublicTrackedRecord(match || null);
    setHasTrackedPublic(true);
    setLoading(false);
  };

  const handleUserAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authMode === 'login') {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ action: 'loginUser', email: authEmail, password: authPassword })
        });

        if (response.ok) {
          const profile = await response.json();
          setCurrentUser(profile);
          setData({ fullName: profile.fullName, passportNum: '', nationality: profile.nationality });
          setShowNotice(false); 
          navigateTo('user-dashboard');
          setDashboardView('new-app');
          setAuthEmail(''); setAuthPassword('');
        } else {
          alert("Invalid login inputs.");
        }
      } else {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            action: 'registerUser', email: authEmail, password: authPassword, fullName: authName, nationality: authNationality
          })
        });

        if (response.ok) {
          const resProfile = await response.json();
          setCurrentUser(resProfile);
          setData({ fullName: resProfile.fullName, passportNum: '', nationality: resProfile.nationality });
          setShowNotice(true);
          navigateTo('user-dashboard');
          setDashboardView('new-app');
          setAuthEmail(''); setAuthPassword(''); setAuthName(''); setAuthNationality('');
        } else {
          alert("Registration execution failed.");
        }
      }
    } catch (error) {
      alert("Connection failure.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'visa2026') {
      setIsAdminLoggedIn(true);
      navigateTo('admin-dashboard');
      setUsername(''); setPassword('');
    } else {
      alert("Access Denied.");
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setIsAdminLoggedIn(false);
    navigateTo('welcome');
    setPublicPassport('');
    setPublicTrackedRecord(null);
    setHasTrackedPublic(false);
  };

  const personalApplications = applications.filter(app => 
    currentUser && app.fullName.toLowerCase() === currentUser.fullName.toLowerCase()
  );

  const filteredAdminApplications = applications.filter(app => 
    app.passportNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.nationality.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    if (applications.length === 0) return alert("Empty database records.");
    const headers = ["Application ID", "Full Name", "Passport Number", "Nationality", "Status", "Submission Date\n"];
    const rows = filteredAdminApplications.map(app => `"${app.id}","${app.fullName}","${app.passportNum}","${app.nationality}","${app.status}","${app.date}"\n`);
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + rows.join("");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "E-Visa_Registry.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadgeStyle = (status) => {
    let bg = colors.bgPending, color = colors.colorPending;
    if (status === 'APPROVED') { bg = colors.bgApproved; color = colors.colorApproved; }
    if (status === 'REJECTED') { bg = colors.bgRejected; color = colors.colorRejected; }
    return { 
      backgroundColor: bg, color: color, padding: '6px 14px', borderRadius: '4px', 
      fontSize: '11px', fontWeight: '700', display: 'inline-block'
    };
  };

  const inputStyle = (fieldName) => ({
    width: '100%', padding: '14px 16px', fontSize: '14px', fontFamily: 'inherit', color: colors.textMain,
    backgroundColor: '#FFFFFF', border: `1px solid ${focusedField === fieldName ? colors.accent : colors.border}`,
    borderRadius: '6px', boxSizing: 'border-box', outline: 'none', transition: 'all 0.15s ease',
    boxShadow: focusedField === fieldName ? `0 0 0 4px rgba(37, 99, 235, 0.15)` : 'none'
  });

  const layoutCardStyle = () => ({
    backgroundColor: colors.cardBg, padding: '40px', borderRadius: '8px',
    border: `1px solid ${colors.border}`, boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
    width: '100%', boxSizing: 'border-box'
  });

  const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '600', color: colors.textMuted };
  const metricCardStyle = { flex: '1', minWidth: '180px', backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '8px', border: `1px solid ${colors.border}`, textAlign: 'left' };
  const thStyle = { padding: '16px', textAlign: 'left', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', borderBottom: `2px solid ${colors.border}`, backgroundColor: '#F8FAFC', color: '#475569' };
  const tdStyle = { padding: '16px', fontSize: '13px', color: colors.textMain, borderBottom: `1px solid ${colors.border}` };
  
  const buttonStyle = (isHovered) => ({
    width: '100%', backgroundColor: isHovered ? colors.buttonHover : colors.buttonBg, color: '#FFFFFF', 
    padding: '14px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
    transition: 'all 0.15s ease', transform: isHovered ? 'translateY(-1px)' : 'none'
  });

  const actionButtonStyle = (type) => ({
    background: type === 'approve' ? colors.bgApproved : colors.bgRejected, border: 'none',
    color: type === 'approve' ? colors.colorApproved : colors.colorRejected, padding: '6px 14px',
    fontSize: '12px', fontWeight: '600', borderRadius: '4px', cursor: 'pointer', marginRight: '6px'
  });

  const renderLeftBrandingPanel = (subtext) => (
    <div style={{ backgroundColor: colors.sidebarBg, color: colors.sidebarText, padding: '50px', width: '40%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', minHeight: '550px', justifyContent: 'space-between', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
      <div>
        <div style={{ fontWeight: '800', fontSize: '22px', letterSpacing: '1px', color: '#FFFFFF', marginBottom: '10px' }}>GLOBAL E-VISA</div>
        <div style={{ width: '40px', height: '3px', backgroundColor: colors.accent }}></div>
      </div>
      <div>
        <h2 style={{ fontSize: '28px', fontWeight: '400', color: '#FFFFFF', margin: '0 0 16px 0', fontFamily: '"Times New Roman", Times, serif', lineHeight: '1.3' }}>Secure Processing Gateway</h2>
        <p style={{ fontSize: '14px', color: '#94A3B8', lineHeight: '1.6', margin: 0 }}>{subtext}</p>
      </div>
      <div style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>OFFICIAL VERIFIED PORTAL NODE</div>
    </div>
  );

  const isSplitLayoutView = ['welcome', 'user-auth', 'admin-login'].includes(view);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, fontFamily: '"Segoe UI", Roboto, sans-serif', color: colors.textMain, display: 'flex', flexDirection: 'column' }}>
      
      <nav style={{ backgroundColor: isSplitLayoutView ? '#FFFFFF' : colors.sidebarBg, padding: '0 50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '75px', borderBottom: isSplitLayoutView ? `1px solid ${colors.border}` : 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.01)' }}>
        <div onClick={handleSignOut} style={{ fontWeight: '800', color: isSplitLayoutView ? colors.sidebarBg : '#FFFFFF', fontSize: '20px', cursor: 'pointer' }}>
          GLOBAL E-VISA
        </div>
        
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          {view === 'welcome' && (
            <>
              <button onClick={() => { navigateTo('public-track'); }} style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: '#64748B' }}>Track File</button>
              <button onClick={() => { navigateTo('user-auth'); setAuthMode('login'); }} style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: colors.textMain }}>User Login</button>
              <button onClick={() => navigateTo('admin-login')} style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: '#64748B' }}>Admin Console</button>
            </>
          )}

          {view === 'public-track' && (
            <button onClick={handleSignOut} style={{ background: 'none', border: '1px solid #475569', padding: '6px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', color: '#FFFFFF', cursor: 'pointer' }}>← Main Menu</button>
          )}

          {(view === 'admin-login' || view === 'admin-dashboard') && (
            <button onClick={handleSignOut} style={{ background: 'none', border: '1px solid #475569', padding: '8px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: '#FFFFFF', cursor: 'pointer' }}>← Exit Node</button>
          )}

          {currentUser && (
            <>
              <span style={{ fontSize: '13px', color: '#94A3B8', fontWeight: '500' }}>Identity Profile: {currentUser.fullName}</span>
              <button onClick={handleSignOut} style={{ background: 'none', border: '1px solid #475569', padding: '6px 14px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', color: '#F87171', cursor: 'pointer' }}>Log Out</button>
            </>
          )}
        </div>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', padding: '50px 24px', justifyContent: 'center', flex: 1 }}>
        
        {isSplitLayoutView && (
          <div style={{ display: 'flex', maxWidth: '950px', width: '100%', backgroundColor: '#FFFFFF', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.08)', border: `1px solid ${colors.border}`, minHeight: '550px' }}>
            
            {view === 'welcome' && (
              <>
                {renderLeftBrandingPanel("Access the global visa application network. Lodge new documents securely or execute real-time status queries instantly via regional registry parameters.")}
                <div style={{ padding: '50px', width: '60%', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxSizing: 'border-box' }}>
                  <h2 style={{ fontSize: '26px', fontWeight: '700', color: colors.textMain, margin: '0 0 8px 0' }}>Official E-Visa System</h2>
                  <p style={{ fontSize: '14px', color: colors.textMuted, lineHeight: '1.6', margin: '0 0 35px 0' }}>Sign in to open your filing workspace or request account creation options to initialize form validation sheets.</p>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <button onClick={() => { navigateTo('user-auth'); setAuthMode('register'); }} style={{ ...buttonStyle(hoveredItem === 'btn-reg'), width: 'auto', padding: '14px 28px' }} onMouseEnter={() => setHoveredItem('btn-reg')} onMouseLeave={() => setHoveredItem(null)}>Create Account</button>
                    <button onClick={() => { navigateTo('public-track'); }} style={{ backgroundColor: 'transparent', border: `1px solid ${colors.border}`, color: colors.textMain, padding: '14px 28px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s' }} onMouseEnter={(e) => { e.target.style.backgroundColor = '#F8FAFC'; }} onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; }}>Track Status</button>
                  </div>
                </div>
              </>
            )}

            {view === 'user-auth' && (
              <>
                {renderLeftBrandingPanel(authMode === 'login' ? "Log in to check processing application timelines or print finalized electronic entry grant layout papers." : "Instantiate unique database row keys to authenticate security profiles and block malformed application submission inputs.")}
                <div style={{ padding: '50px', width: '60%', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxSizing: 'border-box' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: '700', color: colors.textMain, marginBottom: '30px' }}>
                    {authMode === 'login' ? "SIGN IN" : "CREATE ACCOUNT"}
                  </h2>
                  <form onSubmit={handleUserAuth} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {authMode === 'register' && (
                      <>
                        <div>
                          <label style={labelStyle}>Full legal Name</label>
                          <input style={inputStyle('rname')} type="text" required value={authName} onFocus={() => setFocusedField('rname')} onBlur={() => setFocusedField(null)} onChange={(e) => setAuthName(e.target.value)} placeholder="John Doe" />
                        </div>
                        <div>
                          <label style={labelStyle}>Nationality</label>
                          <input style={inputStyle('rnat')} type="text" required value={authNationality} onFocus={() => setFocusedField('rnat')} onBlur={() => setFocusedField(null)} onChange={(e) => setAuthNationality(e.target.value)} placeholder="India" />
                        </div>
                      </>
                    )}
                    <div>
                      <label style={labelStyle}>Email Address</label>
                      <input style={inputStyle('uemail')} type="email" required value={authEmail} onFocus={() => setFocusedField('uemail')} onBlur={() => setFocusedField(null)} onChange={(e) => setAuthEmail(e.target.value)} placeholder="name@example.com" />
                    </div>
                    <div>
                      <label style={labelStyle}>Password</label>
                      <input style={inputStyle('upass')} type="password" required value={authPassword} onFocus={() => setFocusedField('upass')} onBlur={() => setFocusedField(null)} onChange={(e) => setAuthPassword(e.target.value)} placeholder="••••••••" />
                    </div>
                    <button type="submit" style={buttonStyle(hoveredItem === 'btn-auth')} onMouseEnter={() => setHoveredItem('btn-auth')} onMouseLeave={() => setHoveredItem(null)}>
                      {loading ? "Processing..." : authMode === 'login' ? "Sign In" : "Register"}
                    </button>
                  </form>
                  <div style={{ marginTop: '24px', borderTop: `1px solid ${colors.border}`, paddingTop: '16px' }}>
                    <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} style={{ background: 'none', border: 'none', color: colors.accent, fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
                      {authMode === 'login' ? "Toggle Account Creation" : "Toggle Profile Sign In"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {view === 'admin-login' && (
              <>
                {renderLeftBrandingPanel("Management entry hub node for processing metrics, data table filters, and administrative verification decisions.")}
                <div style={{ padding: '50px', width: '60%', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxSizing: 'border-box' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '24px' }}>ADMIN VERIFICATION</h2>
                  <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div>
                      <label style={labelStyle}>Username ID</label>
                      <input style={inputStyle('user')} type="text" required value={username} onFocus={() => setFocusedField('user')} onBlur={() => setFocusedField(null)} onChange={(e) => setUsername(e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Password Matrix Key</label>
                      <input style={inputStyle('pass')} type="password" required value={password} onFocus={() => setFocusedField('pass')} onBlur={() => setFocusedField(null)} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <button type="submit" style={buttonStyle(hoveredItem === 'btn-admin')} onMouseEnter={() => setHoveredItem('btn-admin')} onMouseLeave={() => setHoveredItem(null)}>Verify Node</button>
                  </form>
                </div>
              </>
            )}

          </div>
        )}

        {view === 'public-track' && (
          <div style={{ maxWidth: '700px', width: '100%' }}>
            <div style={layoutCardStyle()}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 6px 0' }}>Track Application Status</h3>
              <p style={{ fontSize: '14px', color: colors.textMuted, margin: '0 0 24px 0' }}>Query application states instantly using passport numbers.</p>
              
              <form onSubmit={handlePublicTrack} style={{ display: 'flex', gap: '12px' }}>
                <input type="text" required value={publicPassport} onChange={(e) => setPublicPassport(e.target.value)} placeholder="Enter Passport Reference..." style={inputStyle('pubQuery')} />
                <button type="submit" style={{ backgroundColor: colors.buttonBg, color: 'white', border: 'none', padding: '0 24px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  {loading ? "Reading..." : "Query Registry"}
                </button>
              </form>
            </div>

            {hasSearchedPublic && (
              <div style={{ ...layoutCardStyle(), marginTop: '24px', textAlign: 'center' }}>
                {!publicTrackedRecord ? (
                  <p style={{ fontSize: '14px', color: colors.textMuted, margin: 0 }}>No records mapped onto passport "{publicPassport}".</p>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px', textAlign: 'left' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', color: colors.textMain, fontWeight: '700' }}>{publicTrackedRecord.fullName}</h4>
                        <span style={{ fontSize: '13px', color: colors.textMuted }}>Origin Country: {publicTrackedRecord.nationality}</span>
                      </div>
                      <span style={getStatusBadgeStyle(publicTrackedRecord.status)}>{publicTrackedRecord.status}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', margin: '0 auto 30px', maxWidth: '480px' }}>
                      <div style={{ position: 'absolute', top: '10px', left: '8%', right: '8%', height: '2px', backgroundColor: colors.border, zIndex: 1 }}>
                        <div style={{ width: publicTrackedRecord.status === 'PENDING' ? '50%' : '100%', height: '100%', backgroundColor: publicTrackedRecord.status === 'REJECTED' ? colors.colorRejected : colors.colorApproved }}></div>
                      </div>
                      <div style={{ zIndex: 2 }}><div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: colors.colorApproved, margin: '0 auto 8px', border: '4px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}></div><span style={{ fontSize: '11px', fontWeight: '600' }}>Received</span></div>
                      <div style={{ zIndex: 2 }}><div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: colors.colorApproved, margin: '0 auto 8px', border: '4px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}></div><span style={{ fontSize: '11px', fontWeight: '600' }}>Review</span></div>
                      <div style={{ zIndex: 2 }}><div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: publicTrackedRecord.status === 'PENDING' ? '#CBD5E1' : publicTrackedRecord.status === 'REJECTED' ? colors.colorRejected : colors.colorApproved, margin: '0 auto 8px', border: '4px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}></div><span style={{ fontSize: '11px', fontWeight: '600' }}>Resolution</span></div>
                    </div>

                    {publicTrackedRecord.status === 'APPROVED' && (
                      <button onClick={() => setSelectedVisa(publicTrackedRecord)} style={{ width: '100%', backgroundColor: 'transparent', border: `1px solid ${colors.colorApproved}`, color: colors.colorApproved, padding: '12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>Download Issued Visa Grant Certificate</button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {view === 'user-dashboard' && currentUser && (
          <div style={{ maxWidth: '950px', width: '100%' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', backgroundColor: '#E2E8F0', padding: '6px', borderRadius: '8px', width: 'fit-content' }}>
              <button onClick={() => setDashboardView('new-app')} style={{ border: 'none', padding: '10px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', backgroundColor: dashboardView === 'new-app' ? '#FFFFFF' : 'transparent', color: colors.textMain }}>File New Application</button>
              <button onClick={() => setDashboardView('my-apps')} style={{ border: 'none', padding: '10px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', backgroundColor: dashboardView === 'my-apps' ? '#FFFFFF' : 'transparent', color: colors.textMain }}>Filing Portfolio ({personalApplications.length})</button>
            </div>

            {dashboardView === 'new-app' ? (
              <div style={layoutCardStyle()}>
                {showNotice && (
                  <div style={{ backgroundColor: colors.noticeBg, color: colors.noticeText, padding: '18px 22px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', marginBottom: '30px', borderLeft: `4px solid ${colors.accent}` }}>
                    Profile initialization active. Input missing passport character codes to complete submission rows.
                  </div>
                )}
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '30px' }}>NEW E-VISA RECOGNITION REGISTRY</h3>
                
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <label style={labelStyle}>Full Name Profile Binding</label>
                    <input style={{ ...inputStyle('fn'), backgroundColor: '#F1F5F9', cursor: 'not-allowed' }} type="text" value={data.fullName} readOnly />
                  </div>
                  <div>
                    <label style={labelStyle}>Passport Code Token</label>
                    <input style={inputStyle('passportNum')} type="text" required value={data.passportNum} onFocus={() => setFocusedField('passportNum')} onBlur={() => setFocusedField(null)} onChange={(e) => setData({...data, passportNum: e.target.value})} placeholder="e.g. Z987654" autoFocus={showNotice} />
                    {errors.passportNum && <span style={{ fontSize: '12px', color: colors.error, display: 'block', marginTop: '6px' }}>{errors.passportNum}</span>}
                  </div>
                  <div>
                    <label style={labelStyle}>Nationality Profile Binding</label>
                    <input style={{ ...inputStyle('nat'), backgroundColor: '#F1F5F9', cursor: 'not-allowed' }} type="text" value={data.nationality} readOnly />
                  </div>
                  <button type="submit" style={buttonStyle(hoveredItem === 'btn-submit')} onMouseEnter={() => setHoveredItem('btn-submit')} onMouseLeave={() => setHoveredItem(null)}>
                    {loading ? "Transmitting..." : "Submit File"}
                  </button>
                </form>
              </div>
            ) : (
              <div style={layoutCardStyle()}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '25px' }}>TRACK YOUR LOGGED PERMITS</h3>
                {personalApplications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: colors.textMuted, border: `1px dashed ${colors.border}`, borderRadius: '8px' }}>No entries found associated with this account.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {personalApplications.map(app => (
                      <div key={app.id} style={{ border: `1px solid ${colors.border}`, padding: '24px', borderRadius: '8px', backgroundColor: '#F8FAFC' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: colors.textMuted }}>File ID Reference: #{app.id}</span>
                            <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '2px' }}>Passport Reference: <span style={{ fontFamily: 'monospace' }}>{app.passportNum}</span></div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <span style={getStatusBadgeStyle(app.status)}>{app.status}</span>
                            {app.status === 'APPROVED' && (
                              <button onClick={() => setSelectedVisa(app)} style={{ backgroundColor: colors.accent, color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Print Document</button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {view === 'admin-dashboard' && isAdminLoggedIn && (
          <div style={{ ...layoutCardStyle(), maxWidth: '1200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px', marginBottom: '35px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700' }}>ADMIN MANAGEMENT MODULE</h2>
              <div style={{ display: 'flex', gap: '14px' }}>
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search database elements..." style={{ ...inputStyle('search'), width: '250px' }} />
                <button onClick={exportToCSV} style={{ backgroundColor: 'transparent', border: `1px solid ${colors.buttonBg}`, color: colors.buttonBg, padding: '0 20px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Export CSV Ledger</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '40px' }}>
              <div style={metricCardStyle}><span style={{ fontSize: '11px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>Total Ingested Rows</span><div style={{ fontSize: '28px', fontWeight: '700', marginTop: '6px' }}>{totalCount}</div></div>
              <div style={metricCardStyle}><span style={{ fontSize: '11px', fontWeight: '700', color: colors.colorPending, textTransform: 'uppercase' }}>Review Backlog Queue</span><div style={{ fontSize: '28px', fontWeight: '700', marginTop: '6px' }}>{pendingCount}</div></div>
              <div style={metricCardStyle}><span style={{ fontSize: '11px', fontWeight: '700', color: colors.colorApproved, textTransform: 'uppercase' }}>Finalized Grants</span><div style={{ fontSize: '28px', fontWeight: '700', marginTop: '6px' }}>{approvedCount}</div></div>
              <div style={metricCardStyle}><span style={{ fontSize: '11px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>Decision Ratio</span><div style={{ fontSize: '28px', fontWeight: '700', marginTop: '6px' }}>{approvalRate}%</div></div>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>ID</th>
                    <th style={thStyle}>Applicant Profile Name</th>
                    <th style={thStyle}>Passport</th>
                    <th style={thStyle}>Nationality</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Ingest Date</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Pipeline Routing Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdminApplications.map((app) => (
                    <tr key={app.id} style={{ backgroundColor: '#FFFFFF' }}>
                      <td style={{ ...tdStyle, fontWeight: '700' }}>#{app.id}</td>
                      <td style={tdStyle}>{app.fullName}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '14px' }}>{app.passportNum}</td>
                      <td style={tdStyle}>{app.nationality}</td>
                      <td style={tdStyle}><span style={getStatusBadgeStyle(app.status)}>{app.status}</span></td>
                      <td style={{ ...tdStyle, color: colors.textMuted }}>{app.date}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        {app.status === 'PENDING' ? (
                          <>
                            <button onClick={() => handleStatusUpdate(app.id, 'APPROVED')} style={actionButtonStyle('approve')}>Approve</button>
                            <button onClick={() => handleStatusUpdate(app.id, 'REJECTED')} style={actionButtonStyle('reject')}>Reject</button>
                          </>
                        ) : app.status === 'APPROVED' ? (
                          <button onClick={() => setSelectedVisa(app)} style={{ ...actionButtonStyle('approve'), backgroundColor: 'transparent', border: `1px solid ${colors.colorApproved}`, color: colors.colorApproved }}>View Document</button>
                        ) : (
                          <span style={{ fontSize: '13px', color: colors.textMuted, fontStyle: 'italic' }}>Archived Row</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {selectedVisa && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '50px', borderRadius: '8px', maxWidth: '600px', width: '100%', border: '1px solid #E2E8F0', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', position: 'relative' }}>
            <button onClick={() => setSelectedVisa(null)} style={{ position: 'absolute', top: '20px', right: '25px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: colors.textMuted }}>&times;</button>
            <div id="printable-visa-document" style={{ textAlign: 'center' }}>
              <h1 style={{ fontWeight: '700', fontSize: '26px', color: colors.textMain, margin: '0 0 6px 0' }}>ELECTRONIC VISA GRANT</h1>
              <p style={{ fontSize: '12px', color: colors.textMuted, margin: '0 0 35px 0', fontWeight: '600' }}>Official Authorization Certificate</p>
              <div style={{ borderTop: `1px solid #E2E8F0`, borderBottom: `1px solid #E2E8F0`, padding: '24px 0', margin: '20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', textAlign: 'left' }}>
                <div><label style={{ fontSize: '11px', color: colors.textMuted, fontWeight: '600', display: 'block', marginBottom: '2px' }}>Document ID</label><span style={{ fontSize: '14px', color: colors.textMain, fontWeight: '700' }}>EV-2026-00{selectedVisa.id}</span></div>
                <div><label style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Visa Class</label><span style={{ fontSize: '14px', color: colors.textMain }}>Short-Stay Tourist (T1)</span></div>
                <div><label style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Full Legal Name</label><span style={{ fontSize: '14px', color: colors.textMain, fontWeight: '600' }}>{selectedVisa.fullName}</span></div>
                <div><label style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Passport Number</label><span style={{ fontSize: '14px', color: colors.textMain, fontFamily: 'monospace' }}>{selectedVisa.passportNum}</span></div>
                <div><label style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Nationality</label><span style={{ fontSize: '14px', color: colors.textMain }}>{selectedVisa.nationality}</span></div>
                <div><label style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', display: 'block', marginBottom: '2px' }}>Issue Date</label><span style={{ fontSize: '14px', color: colors.textMain }}>{selectedVisa.date.substring(0, 10)}</span></div>
              </div>
              <div style={{ marginTop: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ width: '120px', height: '1px', backgroundColor: '#CBD5E1', marginBottom: '6px' }}></div>
                  <span style={{ fontSize: '11px', color: colors.textMuted, fontWeight: '500' }}>Consular Authority</span>
                </div>
                <div style={{ border: `2px solid ${colors.colorApproved}`, color: colors.colorApproved, padding: '8px 16px', fontSize: '13px', fontWeight: '700', borderRadius: '6px', transform: 'rotate(-3deg)', backgroundColor: '#F0FDF4' }}>SECURE GRANTED</div>
              </div>
            </div>
            <button onClick={() => window.print()} style={{ ...buttonStyle(hoveredItem === 'btn-print'), marginTop: '35px' }} onMouseEnter={() => setHoveredItem('btn-print')} onMouseLeave={() => setHoveredItem(null)}>Print Document</button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
