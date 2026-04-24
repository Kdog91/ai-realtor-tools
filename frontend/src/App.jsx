import { useEffect, useState } from "react";
import "./App.css";

const API = "https://ai-realtor-tools-production.up.railway.app";

const TOOLS = [
  { id: "marketing", icon: "📣", label: "Marketing", color: "#f59e0b" },
  { id: "lead-reply", icon: "💬", label: "Lead Reply", color: "#3b82f6" },
  { id: "listing", icon: "🏠", label: "Listing", color: "#10b981" },
  { id: "affordability", icon: "💰", label: "Affordability", color: "#f59e0b" },
  { id: "market", icon: "📊", label: "Market Snapshot", color: "#6366f1" },
  { id: "lead-score", icon: "🎯", label: "Lead Scorer", color: "#ef4444" },
  { id: "objection", icon: "🛡️", label: "Objection Handler", color: "#8b5cf6" },
  { id: "drip", icon: "📧", label: "Drip Emails", color: "#3b82f6" },
  { id: "net-sheet", icon: "🧾", label: "Net Sheet", color: "#10b981" },
  { id: "price-drop", icon: "📉", label: "Price Drop Alert", color: "#ef4444" },
  { id: "neighborhood-bio", icon: "📍", label: "Neighborhood Bio", color: "#f59e0b" },
  { id: "demographics", icon: "🏘️", label: "Demographics", color: "#6366f1" },
  { id: "referral", icon: "🤝", label: "Refer & Earn", color: "#10b981" },
  { id: "history", icon: "📋", label: "History", color: "#8b5cf6" },
];

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${API}/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Something went wrong");
      localStorage.setItem("token", data.token);
      localStorage.setItem("plan", data.plan);
      localStorage.setItem("email", data.email);
      onLogin(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f1117 0%, #1a1f2e 50%, #0f1117 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');`}</style>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: "3rem", marginBottom: 8 }}>🏡</div>
          <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>AI Realtor Tools</h1>
          <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "0.95rem" }}>14 AI-powered tools for real estate agents</p>
        </div>
        <div style={{ background: "#161b27", border: "1px solid #1e2a3a", borderRadius: 16, padding: 32 }}>
          <div style={{ display: "flex", background: "#0f1117", borderRadius: 10, padding: 4, marginBottom: 24 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", transition: "all 0.2s", background: mode === m ? "#3b82f6" : "transparent", color: mode === m ? "#fff" : "#64748b", fontFamily: "'DM Sans', sans-serif" }}>
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>
          <input style={{ width: "100%", background: "#0f1117", border: "1px solid #1e2a3a", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: "0.95rem", boxSizing: "border-box", marginBottom: 12, outline: "none", fontFamily: "'DM Sans', sans-serif" }} type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
          <input style={{ width: "100%", background: "#0f1117", border: "1px solid #1e2a3a", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: "0.95rem", boxSizing: "border-box", marginBottom: 16, outline: "none", fontFamily: "'DM Sans', sans-serif" }} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          {error && <p style={{ color: "#f87171", fontSize: "0.85rem", margin: "0 0 12px", textAlign: "center" }}>{error}</p>}
          <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#fff", border: "none", borderRadius: 10, padding: "14px", fontWeight: 700, fontSize: "1rem", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            {loading ? "Please wait..." : mode === "login" ? "Sign In →" : "Create Free Account →"}
          </button>
          <div style={{ marginTop: 20, padding: "14px", background: "#0f1117", borderRadius: 10, textAlign: "center" }}>
            <span style={{ color: "#64748b", fontSize: "0.8rem" }}>✅ Free: 5 uses &nbsp;·&nbsp; Pro: 200/mo ($29) &nbsp;·&nbsp; Premium: Unlimited ($99)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [usageInfo, setUsageInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeTool, setActiveTool] = useState("marketing");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [form, setForm] = useState({ business_type: "", audience: "", details: "", tone: "" });
  const [result, setResult] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const [leadForm, setLeadForm] = useState({ lead_message: "", property_type: "", tone: "" });
  const [leadResult, setLeadResult] = useState(""); const [leadLoading, setLeadLoading] = useState(false); const [leadError, setLeadError] = useState("");
  const [listingForm, setListingForm] = useState({ address: "", bedrooms: "", bathrooms: "", sqft: "", price: "", features: "", tone: "professional" });
  const [listingResult, setListingResult] = useState(""); const [listingLoading, setListingLoading] = useState(false); const [listingError, setListingError] = useState("");
  const [affordForm, setAffordForm] = useState({ home_price: "", down_payment: "", interest_rate: "", loan_term: "30", annual_income: "", monthly_debts: "" });
  const [affordResult, setAffordResult] = useState(null);
  const [marketForm, setMarketForm] = useState({ zip_code: "", avg_list_price: "", avg_sale_price: "", avg_days_on_market: "", total_listings: "", sold_last_30_days: "", avg_price_per_sqft: "", months_of_inventory: "" });
  const [marketResult, setMarketResult] = useState(null); const [marketLoading, setMarketLoading] = useState(false);
  const [leadScoreForm, setLeadScoreForm] = useState({ lead_name: "", lead_message: "", source: "Zillow", timeframe: "1-3 months", pre_approved: false, has_agent: false });
  const [leadScoreResult, setLeadScoreResult] = useState(null); const [leadScoreLoading, setLeadScoreLoading] = useState(false);
  const [objectionForm, setObjectionForm] = useState({ objection: "", objection_type: "seller", context: "" });
  const [objectionResult, setObjectionResult] = useState(""); const [objectionLoading, setObjectionLoading] = useState(false);
  const [dripForm, setDripForm] = useState({ lead_name: "", lead_type: "buyer", property_interest: "", agent_name: "", tone: "professional" });
  const [dripResult, setDripResult] = useState(""); const [dripLoading, setDripLoading] = useState(false);
  const [netSheetForm, setNetSheetForm] = useState({ sale_price: "", mortgage_balance: "", agent_commission: "6", closing_costs: "2", repairs: "0", other_fees: "0" });
  const [netSheetResult, setNetSheetResult] = useState(null);
  const [priceDropForm, setPriceDropForm] = useState({ address: "", original_price: "", new_price: "", bedrooms: "", bathrooms: "", sqft: "", key_features: "", tone: "professional" });
  const [priceDropResult, setPriceDropResult] = useState(null); const [priceDropLoading, setPriceDropLoading] = useState(false);
  const [neighborhoodForm, setNeighborhoodForm] = useState({ neighborhood: "", city: "", state: "", highlights: "", target_buyer: "families" });
  const [neighborhoodResult, setNeighborhoodResult] = useState(""); const [neighborhoodLoading, setNeighborhoodLoading] = useState(false);
  const [censusZip, setCensusZip] = useState(""); const [censusResult, setCensusResult] = useState(null); const [censusLoading, setCensusLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false); const [adminStats, setAdminStats] = useState(null);
  const [referralStats, setReferralStats] = useState(null); const [showReferral, setShowReferral] = useState(false);

  useEffect(() => { const token = localStorage.getItem("token"); if (token) fetchMe(token); }, []);

  const fetchMe = async (token) => {
    try {
      const res = await fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { logout(); return; }
      const data = await res.json();
      setUser({ ...data, token });
      setUsageInfo({ usage: data.usage, limit: data.limit, plan: data.plan });
      fetchHistory(token);
    } catch { logout(); }
  };

  const handleLogin = (data) => {
    setUser(data);
    setUsageInfo({ usage: 0, limit: data.plan === "free" ? 5 : data.plan === "pro" ? 200 : 999999, plan: data.plan });
    fetchHistory(data.token);
  };

  const logout = () => { localStorage.clear(); setUser(null); setHistory([]); };
  const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` });

  const fetchHistory = async (token) => {
    try {
      const res = await fetch(`${API}/history`, { headers: { Authorization: `Bearer ${token || localStorage.getItem("token")}` } });
      const data = await res.json();
      setHistory(data.history || []);
    } catch {}
  };

  const handleGenerate = async () => { setError(""); setLoading(true); try { const res = await fetch(`${API}/generate`, { method: "POST", headers: authHeaders(), body: JSON.stringify(form) }); const data = await res.json(); if (!res.ok) throw new Error(data.detail); setResult(data.result); fetchHistory(); fetchMe(localStorage.getItem("token")); } catch (err) { setError(err.message); } finally { setLoading(false); } };
  const handleLeadReply = async () => { setLeadError(""); setLeadLoading(true); try { const res = await fetch(`${API}/lead-reply`, { method: "POST", headers: authHeaders(), body: JSON.stringify(leadForm) }); const data = await res.json(); if (!res.ok) throw new Error(data.detail); setLeadResult(data.result); fetchHistory(); fetchMe(localStorage.getItem("token")); } catch (err) { setLeadError(err.message); } finally { setLeadLoading(false); } };
  const handleListing = async () => { setListingError(""); setListingLoading(true); try { const res = await fetch(`${API}/listing-description`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ ...listingForm, bedrooms: parseInt(listingForm.bedrooms), bathrooms: parseFloat(listingForm.bathrooms), sqft: parseInt(listingForm.sqft) }) }); const data = await res.json(); if (!res.ok) throw new Error(data.detail); setListingResult(data.result); fetchHistory(); fetchMe(localStorage.getItem("token")); } catch (err) { setListingError(err.message); } finally { setListingLoading(false); } };
  const handleAffordability = async () => { try { const res = await fetch(`${API}/affordability`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ home_price: parseFloat(affordForm.home_price), down_payment: parseFloat(affordForm.down_payment), interest_rate: parseFloat(affordForm.interest_rate), loan_term: parseInt(affordForm.loan_term), annual_income: parseFloat(affordForm.annual_income), monthly_debts: parseFloat(affordForm.monthly_debts || 0) }) }); const data = await res.json(); if (!res.ok) throw new Error(data.detail); setAffordResult(data); } catch (err) { alert(err.message); } };
  const handleMarketSnapshot = async () => { setMarketLoading(true); try { const res = await fetch(`${API}/market-snapshot`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ zip_code: marketForm.zip_code, avg_list_price: parseFloat(marketForm.avg_list_price), avg_sale_price: parseFloat(marketForm.avg_sale_price), avg_days_on_market: parseFloat(marketForm.avg_days_on_market), total_listings: parseInt(marketForm.total_listings), sold_last_30_days: parseInt(marketForm.sold_last_30_days), avg_price_per_sqft: parseFloat(marketForm.avg_price_per_sqft), months_of_inventory: parseFloat(marketForm.months_of_inventory) }) }); const data = await res.json(); if (!res.ok) throw new Error(data.detail); setMarketResult(data); } catch (err) { alert(err.message); } finally { setMarketLoading(false); } };
  const handleLeadScore = async () => { setLeadScoreLoading(true); try { const res = await fetch(`${API}/lead-score`, { method: "POST", headers: authHeaders(), body: JSON.stringify(leadScoreForm) }); const data = await res.json(); if (!res.ok) throw new Error(data.detail); setLeadScoreResult(data); fetchMe(localStorage.getItem("token")); } catch (err) { alert(err.message); } finally { setLeadScoreLoading(false); } };
  const handleObjection = async () => { setObjectionLoading(true); try { const res = await fetch(`${API}/objection-handler`, { method: "POST", headers: authHeaders(), body: JSON.stringify(objectionForm) }); const data = await res.json(); if (!res.ok) throw new Error(data.detail); setObjectionResult(data.result); fetchMe(localStorage.getItem("token")); } catch (err) { alert(err.message); } finally { setObjectionLoading(false); } };
  const handleDripEmails = async () => { setDripLoading(true); try { const res = await fetch(`${API}/drip-emails`, { method: "POST", headers: authHeaders(), body: JSON.stringify(dripForm) }); const data = await res.json(); if (!res.ok) throw new Error(data.detail); setDripResult(data.result); fetchMe(localStorage.getItem("token")); } catch (err) { alert(err.message); } finally { setDripLoading(false); } };
  const handleNetSheet = async () => { try { const res = await fetch(`${API}/seller-net-sheet`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ sale_price: parseFloat(netSheetForm.sale_price), mortgage_balance: parseFloat(netSheetForm.mortgage_balance), agent_commission: parseFloat(netSheetForm.agent_commission), closing_costs: parseFloat(netSheetForm.closing_costs), repairs: parseFloat(netSheetForm.repairs || 0), other_fees: parseFloat(netSheetForm.other_fees || 0) }) }); const data = await res.json(); if (!res.ok) throw new Error(data.detail); setNetSheetResult(data); } catch (err) { alert(err.message); } };
  const handlePriceDrop = async () => { setPriceDropLoading(true); try { const res = await fetch(`${API}/price-drop-alert`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ ...priceDropForm, bedrooms: parseInt(priceDropForm.bedrooms), bathrooms: parseFloat(priceDropForm.bathrooms), sqft: parseInt(priceDropForm.sqft) }) }); const data = await res.json(); if (!res.ok) throw new Error(data.detail); setPriceDropResult(data); fetchMe(localStorage.getItem("token")); } catch (err) { alert(err.message); } finally { setPriceDropLoading(false); } };
  const handleNeighborhoodBio = async () => { setNeighborhoodLoading(true); try { const res = await fetch(`${API}/neighborhood-bio`, { method: "POST", headers: authHeaders(), body: JSON.stringify(neighborhoodForm) }); const data = await res.json(); if (!res.ok) throw new Error(data.detail); setNeighborhoodResult(data.result); fetchMe(localStorage.getItem("token")); } catch (err) { alert(err.message); } finally { setNeighborhoodLoading(false); } };
  const handleCensus = async () => { setCensusLoading(true); try { const res = await fetch(`${API}/neighborhood-demographics`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ zip_code: censusZip }) }); const data = await res.json(); if (!res.ok) throw new Error(data.detail); setCensusResult(data); fetchMe(localStorage.getItem("token")); } catch (err) { alert(err.message); } finally { setCensusLoading(false); } };
  const fetchAdminStats = async () => { try { const res = await fetch(`${API}/admin/stats`, { headers: authHeaders() }); const data = await res.json(); if (!res.ok) throw new Error(data.detail); setAdminStats(data); setShowAdmin(true); } catch { alert("Admin access only"); } };
  const fetchReferralStats = async () => { try { const res = await fetch(`${API}/referral/stats`, { headers: authHeaders() }); const data = await res.json(); setReferralStats(data); setShowReferral(true); } catch (err) { alert(err.message); } };
  const handleUpgrade = async (plan) => { try { const res = await fetch(`${API}/create-checkout`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ plan }) }); const data = await res.json(); if (!res.ok) throw new Error(data.detail); window.location.href = data.url; } catch (err) { alert(err.message); } };

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  const activeTool_ = TOOLS.find(t => t.id === activeTool);

  const handleToolSelect = (id) => { setActiveTool(id); setMobileMenuOpen(false); };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#080c14", fontFamily: "'DM Sans', sans-serif", color: "#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #080c14; }
        ::-webkit-scrollbar-thumb { background: #1e2a3a; border-radius: 2px; }
        input::placeholder, textarea::placeholder { color: #334155; }
        input:focus, textarea:focus, select:focus { outline: none !important; border-color: #3b82f6 !important; }
        .tool-btn:hover { background: #1e2a3a !important; }
        select option { background: #0d1117; }
        @media (max-width: 768px) {
          .sidebar { transform: translateX(-100%); transition: transform 0.3s; }
          .sidebar.open { transform: translateX(0) !important; }
          .main-content { margin-left: 0 !important; }
          .top-bar { padding: 12px 16px !important; }
          .content-area { padding: 16px !important; }
          .grid-2 { grid-template-columns: 1fr !important; }
          .grid-4 { grid-template-columns: 1fr 1fr !important; }
          .row-flex { flex-direction: column !important; }
        }
      `}</style>

      {/* Sidebar */}
      <div className={`sidebar ${mobileMenuOpen ? "open" : ""}`} style={{ width: 240, background: "#0d1117", borderRight: "1px solid #1e2a3a", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 200, overflowY: "auto" }}>
        <div style={{ padding: "20px 16px", borderBottom: "1px solid #1e2a3a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: "1.5rem" }}>🏡</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#fff" }}>AI Realtor Tools</div>
              <div style={{ fontSize: "0.7rem", color: "#334155" }}>14 AI-powered tools</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "12px 8px", flex: 1 }}>
          {TOOLS.map(tool => (
            <button key={tool.id} className="tool-btn" onClick={() => handleToolSelect(tool.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: "none", borderRadius: 8, cursor: "pointer", marginBottom: 2, background: activeTool === tool.id ? "#1e2a3a" : "transparent", color: activeTool === tool.id ? "#fff" : "#64748b", textAlign: "left", fontSize: "0.85rem", fontWeight: activeTool === tool.id ? 600 : 400, transition: "all 0.15s", fontFamily: "'DM Sans', sans-serif" }}>
              <span style={{ fontSize: "1rem" }}>{tool.icon}</span>
              <span style={{ flex: 1 }}>{tool.label}</span>
              {activeTool === tool.id && <span style={{ width: 6, height: 6, borderRadius: "50%", background: tool.color, flexShrink: 0 }}></span>}
            </button>
          ))}
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e2a3a" }}>
          <div style={{ background: "#080c14", borderRadius: 10, padding: "12px", marginBottom: 8 }}>
            <div style={{ fontSize: "0.7rem", color: "#334155", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Plan</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontWeight: 700, color: usageInfo?.plan === "premium" ? "#a78bfa" : usageInfo?.plan === "pro" ? "#60a5fa" : "#64748b", fontSize: "0.85rem" }}>{(usageInfo?.plan || "free").toUpperCase()}</span>
              <span style={{ fontSize: "0.75rem", color: "#334155" }}>{usageInfo?.usage ?? 0}/{usageInfo?.limit === 999999 ? "∞" : usageInfo?.limit}</span>
            </div>
            <div style={{ height: 3, background: "#1e2a3a", borderRadius: 2 }}>
              <div style={{ height: "100%", borderRadius: 2, background: "linear-gradient(90deg, #3b82f6, #6366f1)", width: usageInfo?.limit === 999999 ? "100%" : `${Math.min(100, ((usageInfo?.usage || 0) / (usageInfo?.limit || 5)) * 100)}%`, transition: "width 0.3s" }}></div>
            </div>
          </div>
          {usageInfo?.plan === "free" && (
            <button onClick={() => handleUpgrade("pro")} style={{ width: "100%", marginBottom: 8, padding: "10px", background: "linear-gradient(135deg, #3b82f6, #6366f1)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>⚡ Upgrade to Pro $29/mo</button>
          )}
          <button onClick={logout} style={{ width: "100%", padding: "10px", background: "transparent", border: "1px solid #1e2a3a", borderRadius: 8, color: "#64748b", cursor: "pointer", fontSize: "0.85rem", fontFamily: "'DM Sans', sans-serif" }}>Sign Out</button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && <div onClick={() => setMobileMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 199 }} />}

      {/* Main Content */}
      <div className="main-content" style={{ marginLeft: 240, flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Top Bar */}
        <div className="top-bar" style={{ background: "#0d1117", borderBottom: "1px solid #1e2a3a", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ display: "none", background: "none", border: "none", color: "#64748b", fontSize: "1.3rem", cursor: "pointer", padding: "4px", fontFamily: "'DM Sans', sans-serif" }} className="mobile-menu-btn">☰</button>
            <span style={{ fontSize: "1.2rem" }}>{activeTool_?.icon}</span>
            <div>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: "1rem" }}>{activeTool_?.label}</div>
              <div style={{ fontSize: "0.72rem", color: "#334155" }}>👤 {user.email}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {user?.email === "ks427790@gmail.com" && (
              <button onClick={showAdmin ? () => setShowAdmin(false) : fetchAdminStats} style={{ padding: "8px 14px", background: "#2d1b69", border: "1px solid #4c1d95", borderRadius: 8, color: "#a78bfa", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>📈 Admin</button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="content-area" style={{ flex: 1, padding: "28px 32px", maxWidth: 860, width: "100%" }}>

          {/* Admin Dashboard */}
          {showAdmin && adminStats && (
            <div style={{ background: "#0d1117", border: "1px solid #2d1b69", borderRadius: 16, padding: 24, marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2 style={{ margin: 0, color: "#fff", fontSize: "1.1rem", fontWeight: 700 }}>📈 Admin Dashboard</h2>
                <button onClick={() => setShowAdmin(false)} style={{ background: "#1e2a3a", border: "none", borderRadius: 6, color: "#64748b", padding: "6px 12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Close</button>
              </div>
              <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
                {[{label:"MRR",value:`$${adminStats.mrr}`,color:"#4ade80"},{label:"Users",value:adminStats.total_users,color:"#fff"},{label:"Pro",value:adminStats.pro_users,color:"#60a5fa"},{label:"Premium",value:adminStats.premium_users,color:"#a78bfa"},{label:"Free",value:adminStats.free_users,color:"#64748b"},{label:"Generations",value:adminStats.total_generations,color:"#fff"},{label:"Pro MRR",value:`$${adminStats.pro_users*29}`,color:"#60a5fa"},{label:"Prem MRR",value:`$${adminStats.premium_users*99}`,color:"#a78bfa"}].map((item,i) => (
                  <StatBox key={i} label={item.label} value={item.value} color={item.color} />
                ))}
              </div>
              <div style={{ background: "#080c14", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: "0.7rem", color: "#334155", marginBottom: 10, fontWeight: 600, textTransform: "uppercase" }}>Recent Signups</div>
                {adminStats.recent_users.map((u,i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #1e2a3a" }}>
                    <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}>{u.email}</span>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: u.plan==="premium"?"#2d1b69":u.plan==="pro"?"#1e3a5f":"#1e2a3a", color: u.plan==="premium"?"#a78bfa":u.plan==="pro"?"#60a5fa":"#64748b" }}>{u.plan?.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTool === "marketing" && (
            <Card title="📣 Create Marketing Content" subtitle="Generate Instagram captions, Facebook ads, and hashtags instantly">
              <Row><Field label="Business Type"><Input placeholder="Gym, barber, realtor..." value={form.business_type} onChange={e => setForm({...form, business_type: e.target.value})} /></Field><Field label="Audience"><Input placeholder="Young adults, buyers..." value={form.audience} onChange={e => setForm({...form, audience: e.target.value})} /></Field></Row>
              <Field label="Details" full><Input placeholder="Promo, open house, discount..." value={form.details} onChange={e => setForm({...form, details: e.target.value})} /></Field>
              <Field label="Tone" full><Input placeholder="Exciting, professional, friendly..." value={form.tone} onChange={e => setForm({...form, tone: e.target.value})} /></Field>
              {error && <ErrMsg>{error}</ErrMsg>}
              <BtnRow><Btn onClick={handleGenerate} loading={loading} label="Generate Content" /><ClearBtn onClick={() => { setForm({business_type:"",audience:"",details:"",tone:""}); setResult(""); }} /></BtnRow>
              {result && <Result value={result} />}
            </Card>
          )}

          {activeTool === "lead-reply" && (
            <Card title="💬 Lead Reply Generator" subtitle="Write perfect replies to any lead message in seconds">
              <Field label="Lead's Message" full><Textarea placeholder="Hi, I saw your listing on Zillow..." value={leadForm.lead_message} onChange={e => setLeadForm({...leadForm, lead_message: e.target.value})} /></Field>
              <Row><Field label="Property Type"><Input placeholder="Single-family, condo..." value={leadForm.property_type} onChange={e => setLeadForm({...leadForm, property_type: e.target.value})} /></Field><Field label="Tone"><Input placeholder="Professional, friendly..." value={leadForm.tone} onChange={e => setLeadForm({...leadForm, tone: e.target.value})} /></Field></Row>
              {leadError && <ErrMsg>{leadError}</ErrMsg>}
              <BtnRow><Btn onClick={handleLeadReply} loading={leadLoading} label="Generate Reply" /><ClearBtn onClick={() => { setLeadForm({lead_message:"",property_type:"",tone:""}); setLeadResult(""); }} /></BtnRow>
              {leadResult && <Result value={leadResult} />}
            </Card>
          )}

          {activeTool === "listing" && (
            <Card title="🏠 Listing Description Generator" subtitle="Create compelling MLS and marketing descriptions">
              <Row><Field label="Address / Area"><Input placeholder="123 Oak St, Austin TX..." value={listingForm.address} onChange={e => setListingForm({...listingForm, address: e.target.value})} /></Field><Field label="Price"><Input placeholder="$425,000" value={listingForm.price} onChange={e => setListingForm({...listingForm, price: e.target.value})} /></Field></Row>
              <Row><Field label="Beds"><Input type="number" placeholder="3" value={listingForm.bedrooms} onChange={e => setListingForm({...listingForm, bedrooms: e.target.value})} /></Field><Field label="Baths"><Input type="number" placeholder="2.5" value={listingForm.bathrooms} onChange={e => setListingForm({...listingForm, bathrooms: e.target.value})} /></Field><Field label="Sqft"><Input type="number" placeholder="1850" value={listingForm.sqft} onChange={e => setListingForm({...listingForm, sqft: e.target.value})} /></Field></Row>
              <Field label="Key Features" full><Input placeholder="Pool, granite counters, 2-car garage..." value={listingForm.features} onChange={e => setListingForm({...listingForm, features: e.target.value})} /></Field>
              <Field label="Tone" full><Select value={listingForm.tone} onChange={e => setListingForm({...listingForm, tone: e.target.value})}><option value="professional">Professional</option><option value="luxury">Luxury</option><option value="friendly">Warm & Friendly</option><option value="investment">Investment Focused</option></Select></Field>
              {listingError && <ErrMsg>{listingError}</ErrMsg>}
              <BtnRow><Btn onClick={handleListing} loading={listingLoading} label="Generate Listing" /><ClearBtn onClick={() => { setListingForm({address:"",bedrooms:"",bathrooms:"",sqft:"",price:"",features:"",tone:"professional"}); setListingResult(""); }} /></BtnRow>
              {listingResult && <Result value={listingResult} />}
            </Card>
          )}

          {activeTool === "affordability" && (
            <Card title="💰 Buyer Affordability Calculator" subtitle="Show buyers exactly what they can afford">
              <Row><Field label="Home Price ($)"><Input type="number" placeholder="450000" value={affordForm.home_price} onChange={e => setAffordForm({...affordForm, home_price: e.target.value})} /></Field><Field label="Down Payment ($)"><Input type="number" placeholder="90000" value={affordForm.down_payment} onChange={e => setAffordForm({...affordForm, down_payment: e.target.value})} /></Field></Row>
              <Row><Field label="Interest Rate (%)"><Input type="number" step="0.1" placeholder="6.8" value={affordForm.interest_rate} onChange={e => setAffordForm({...affordForm, interest_rate: e.target.value})} /></Field><Field label="Loan Term"><Select value={affordForm.loan_term} onChange={e => setAffordForm({...affordForm, loan_term: e.target.value})}><option value="30">30 years</option><option value="20">20 years</option><option value="15">15 years</option></Select></Field></Row>
              <Row><Field label="Annual Income ($)"><Input type="number" placeholder="95000" value={affordForm.annual_income} onChange={e => setAffordForm({...affordForm, annual_income: e.target.value})} /></Field><Field label="Monthly Debts ($)"><Input type="number" placeholder="400" value={affordForm.monthly_debts} onChange={e => setAffordForm({...affordForm, monthly_debts: e.target.value})} /></Field></Row>
              <BtnRow><Btn onClick={handleAffordability} loading={false} label="Calculate" /><ClearBtn onClick={() => { setAffordForm({home_price:"",down_payment:"",interest_rate:"",loan_term:"30",annual_income:"",monthly_debts:""}); setAffordResult(null); }} /></BtnRow>
              {affordResult && (
                <div className="grid-2" style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[{label:"Monthly P&I",value:`$${affordResult.monthly_payment.toLocaleString()}`},{label:"Tax & Insurance",value:`$${affordResult.est_tax_insurance.toLocaleString()}`},{label:"Total Monthly",value:`$${affordResult.total_monthly.toLocaleString()}`},{label:"Down Payment %",value:`${affordResult.down_payment_pct}%`},{label:"DTI Ratio",value:`${affordResult.dti_ratio}%`},{label:"DTI Status",value:affordResult.dti_status.toUpperCase(),color:affordResult.dti_status==="strong"?"#4ade80":affordResult.dti_status==="acceptable"?"#facc15":"#f87171"},{label:"Max Price",value:`$${Math.round(affordResult.max_recommended_price).toLocaleString()}`},{label:"Loan Amount",value:`$${affordResult.loan_amount.toLocaleString()}`}].map((item,i) => (
                    <StatBox key={i} label={item.label} value={item.value} color={item.color} />
                  ))}
                </div>
              )}
            </Card>
          )}

          {activeTool === "market" && (
            <Card title="📊 Market Snapshot Generator" subtitle="Generate client-ready market reports from your MLS data">
              <Row><Field label="ZIP Code"><Input placeholder="37201" value={marketForm.zip_code} onChange={e => setMarketForm({...marketForm, zip_code: e.target.value})} /></Field><Field label="Avg List Price ($)"><Input type="number" placeholder="425000" value={marketForm.avg_list_price} onChange={e => setMarketForm({...marketForm, avg_list_price: e.target.value})} /></Field><Field label="Avg Sale Price ($)"><Input type="number" placeholder="418000" value={marketForm.avg_sale_price} onChange={e => setMarketForm({...marketForm, avg_sale_price: e.target.value})} /></Field></Row>
              <Row><Field label="Days on Market"><Input type="number" placeholder="21" value={marketForm.avg_days_on_market} onChange={e => setMarketForm({...marketForm, avg_days_on_market: e.target.value})} /></Field><Field label="Active Listings"><Input type="number" placeholder="145" value={marketForm.total_listings} onChange={e => setMarketForm({...marketForm, total_listings: e.target.value})} /></Field><Field label="Sold Last 30 Days"><Input type="number" placeholder="48" value={marketForm.sold_last_30_days} onChange={e => setMarketForm({...marketForm, sold_last_30_days: e.target.value})} /></Field></Row>
              <Row><Field label="Price Per Sqft ($)"><Input type="number" placeholder="198" value={marketForm.avg_price_per_sqft} onChange={e => setMarketForm({...marketForm, avg_price_per_sqft: e.target.value})} /></Field><Field label="Months of Inventory"><Input type="number" step="0.1" placeholder="2.8" value={marketForm.months_of_inventory} onChange={e => setMarketForm({...marketForm, months_of_inventory: e.target.value})} /></Field></Row>
              <BtnRow><Btn onClick={handleMarketSnapshot} loading={marketLoading} label="Generate Snapshot" /><ClearBtn onClick={() => { setMarketForm({zip_code:"",avg_list_price:"",avg_sale_price:"",avg_days_on_market:"",total_listings:"",sold_last_30_days:"",avg_price_per_sqft:"",months_of_inventory:""}); setMarketResult(null); }} /></BtnRow>
              {marketResult && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ background: marketResult.market_color==="red"?"rgba(239,68,68,0.1)":marketResult.market_color==="orange"?"rgba(249,115,22,0.1)":marketResult.market_color==="green"?"rgba(34,197,94,0.1)":"rgba(59,130,246,0.1)", border: `1px solid ${marketResult.market_color==="red"?"#ef4444":marketResult.market_color==="orange"?"#f97316":marketResult.market_color==="green"?"#22c55e":"#3b82f6"}`, borderRadius: 12, padding: "16px", marginBottom: 16, textAlign: "center" }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: marketResult.market_color==="red"?"#ef4444":marketResult.market_color==="orange"?"#f97316":marketResult.market_color==="green"?"#22c55e":"#3b82f6" }}>{marketResult.market_type}</div>
                    <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: 4 }}>ZIP {marketResult.zip_code}</div>
                  </div>
                  <Result value={marketResult.summary} />
                </div>
              )}
            </Card>
          )}

          {activeTool === "lead-score" && (
            <Card title="🎯 Lead Scorer" subtitle="AI scores lead intent and tells you exactly what to do next">
              <Row><Field label="Lead Name"><Input placeholder="John Smith" value={leadScoreForm.lead_name} onChange={e => setLeadScoreForm({...leadScoreForm, lead_name: e.target.value})} /></Field><Field label="Source"><Select value={leadScoreForm.source} onChange={e => setLeadScoreForm({...leadScoreForm, source: e.target.value})}><option>Zillow</option><option>Realtor.com</option><option>Facebook</option><option>Instagram</option><option>Referral</option><option>Cold Call</option><option>Open House</option><option>Website</option></Select></Field><Field label="Timeframe"><Select value={leadScoreForm.timeframe} onChange={e => setLeadScoreForm({...leadScoreForm, timeframe: e.target.value})}><option>ASAP</option><option>1-3 months</option><option>3-6 months</option><option>6-12 months</option><option>Just browsing</option></Select></Field></Row>
              <Field label="Lead's Message" full><Textarea placeholder="Hi, I saw your listing..." value={leadScoreForm.lead_message} onChange={e => setLeadScoreForm({...leadScoreForm, lead_message: e.target.value})} /></Field>
              <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: "0.9rem", cursor: "pointer" }}><input type="checkbox" checked={leadScoreForm.pre_approved} onChange={e => setLeadScoreForm({...leadScoreForm, pre_approved: e.target.checked})} /> Pre-approved</label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: "0.9rem", cursor: "pointer" }}><input type="checkbox" checked={leadScoreForm.has_agent} onChange={e => setLeadScoreForm({...leadScoreForm, has_agent: e.target.checked})} /> Has an agent</label>
              </div>
              <BtnRow><Btn onClick={handleLeadScore} loading={leadScoreLoading} label="Score This Lead" /><ClearBtn onClick={() => { setLeadScoreForm({lead_name:"",lead_message:"",source:"Zillow",timeframe:"1-3 months",pre_approved:false,has_agent:false}); setLeadScoreResult(null); }} /></BtnRow>
              {leadScoreResult && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                    <div style={{ background: "#080c14", borderRadius: 12, padding: 20, textAlign: "center", minWidth: 100, border: "1px solid #1e2a3a" }}>
                      <div style={{ fontSize: "0.68rem", color: "#334155", marginBottom: 4, textTransform: "uppercase" }}>Score</div>
                      <div style={{ fontSize: "2.5rem", fontWeight: 800, color: leadScoreResult.score>=8?"#4ade80":leadScoreResult.score>=5?"#facc15":"#f87171" }}>{leadScoreResult.score}</div>
                      <div style={{ fontSize: "0.68rem", color: "#334155" }}>/10</div>
                    </div>
                    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, minWidth: 200 }}>
                      <StatBox label="Temperature" value={leadScoreResult.temperature} color={leadScoreResult.temperature==="Hot"?"#ef4444":leadScoreResult.temperature==="Warm"?"#f97316":"#3b82f6"} />
                      <StatBox label="Priority" value={leadScoreResult.priority} color={leadScoreResult.priority==="Urgent"?"#ef4444":leadScoreResult.priority==="High"?"#f97316":"#facc15"} />
                      <div style={{ gridColumn: "span 2", background: "#080c14", borderRadius: 10, padding: "10px 12px", border: "1px solid #1e2a3a" }}>
                        <div style={{ fontSize: "0.68rem", color: "#334155", marginBottom: 4, textTransform: "uppercase" }}>Summary</div>
                        <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{leadScoreResult.summary}</div>
                      </div>
                    </div>
                  </div>
                  {[{label:"⚡ NEXT ACTION",value:leadScoreResult.next_action,color:"#4ade80"},{label:"⚠️ WATCH OUT FOR",value:leadScoreResult.watch_out,color:"#f87171"},{label:"💬 FOLLOW-UP MESSAGE",value:leadScoreResult.follow_up,color:"#3b82f6"}].map((item,i) => (
                    <div key={i} style={{ background: "#080c14", borderRadius: 10, padding: 14, marginBottom: 10, border: "1px solid #1e2a3a" }}>
                      <div style={{ fontSize: "0.68rem", color: item.color, marginBottom: 6, fontWeight: 700, textTransform: "uppercase" }}>{item.label}</div>
                      <div style={{ fontSize: "0.88rem", color: "#94a3b8" }}>{item.value}</div>
                      {i === 2 && <CopyBtn value={item.value} />}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {activeTool === "objection" && (
            <Card title="🛡️ Objection Handler" subtitle="Turn any objection into a confident ready-to-say response">
              <Row><Field label="Type"><Select value={objectionForm.objection_type} onChange={e => setObjectionForm({...objectionForm, objection_type: e.target.value})}><option value="seller">Seller</option><option value="buyer">Buyer</option><option value="commission">Commission</option><option value="price">Price</option></Select></Field><Field label="The Objection"><Input placeholder="I want to wait until spring..." value={objectionForm.objection} onChange={e => setObjectionForm({...objectionForm, objection: e.target.value})} /></Field></Row>
              <Field label="Context (optional)" full><Input placeholder="Seller has been on market 45 days..." value={objectionForm.context} onChange={e => setObjectionForm({...objectionForm, context: e.target.value})} /></Field>
              <BtnRow><Btn onClick={handleObjection} loading={objectionLoading} label="Handle Objection" /><ClearBtn onClick={() => { setObjectionForm({objection:"",objection_type:"seller",context:""}); setObjectionResult(""); }} /></BtnRow>
              {objectionResult && <Result value={objectionResult} />}
            </Card>
          )}

          {activeTool === "drip" && (
            <Card title="📧 Drip Email Writer" subtitle="Generate a 3-email follow-up sequence for any lead">
              <Row><Field label="Lead Name"><Input placeholder="Sarah Johnson" value={dripForm.lead_name} onChange={e => setDripForm({...dripForm, lead_name: e.target.value})} /></Field><Field label="Lead Type"><Select value={dripForm.lead_type} onChange={e => setDripForm({...dripForm, lead_type: e.target.value})}><option value="buyer">Buyer</option><option value="seller">Seller</option><option value="investor">Investor</option><option value="renter">Renter</option></Select></Field><Field label="Tone"><Select value={dripForm.tone} onChange={e => setDripForm({...dripForm, tone: e.target.value})}><option value="professional">Professional</option><option value="friendly">Friendly</option><option value="urgent">Urgent</option></Select></Field></Row>
              <Row><Field label="Property Interest"><Input placeholder="3bed single family under $450k" value={dripForm.property_interest} onChange={e => setDripForm({...dripForm, property_interest: e.target.value})} /></Field><Field label="Your Name"><Input placeholder="Kevin Simmons" value={dripForm.agent_name} onChange={e => setDripForm({...dripForm, agent_name: e.target.value})} /></Field></Row>
              <BtnRow><Btn onClick={handleDripEmails} loading={dripLoading} label="Generate 3 Emails" /><ClearBtn onClick={() => { setDripForm({lead_name:"",lead_type:"buyer",property_interest:"",agent_name:"",tone:"professional"}); setDripResult(""); }} /></BtnRow>
              {dripResult && <Result value={dripResult} />}
            </Card>
          )}

          {activeTool === "net-sheet" && (
            <Card title="🧾 Seller Net Sheet" subtitle="Show sellers exactly how much they'll walk away with">
              <Row><Field label="Sale Price ($)"><Input type="number" placeholder="450000" value={netSheetForm.sale_price} onChange={e => setNetSheetForm({...netSheetForm, sale_price: e.target.value})} /></Field><Field label="Mortgage Balance ($)"><Input type="number" placeholder="220000" value={netSheetForm.mortgage_balance} onChange={e => setNetSheetForm({...netSheetForm, mortgage_balance: e.target.value})} /></Field></Row>
              <Row><Field label="Commission (%)"><Input type="number" placeholder="6" value={netSheetForm.agent_commission} onChange={e => setNetSheetForm({...netSheetForm, agent_commission: e.target.value})} /></Field><Field label="Closing Costs (%)"><Input type="number" placeholder="2" value={netSheetForm.closing_costs} onChange={e => setNetSheetForm({...netSheetForm, closing_costs: e.target.value})} /></Field><Field label="Repairs ($)"><Input type="number" placeholder="0" value={netSheetForm.repairs} onChange={e => setNetSheetForm({...netSheetForm, repairs: e.target.value})} /></Field><Field label="Other Fees ($)"><Input type="number" placeholder="0" value={netSheetForm.other_fees} onChange={e => setNetSheetForm({...netSheetForm, other_fees: e.target.value})} /></Field></Row>
              <BtnRow><Btn onClick={handleNetSheet} loading={false} label="Calculate Net" /><ClearBtn onClick={() => { setNetSheetForm({sale_price:"",mortgage_balance:"",agent_commission:"6",closing_costs:"2",repairs:"0",other_fees:"0"}); setNetSheetResult(null); }} /></BtnRow>
              {netSheetResult && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ background: netSheetResult.net_proceeds>0?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)", border: `1px solid ${netSheetResult.net_proceeds>0?"#22c55e":"#ef4444"}`, borderRadius: 12, padding: 20, textAlign: "center", marginBottom: 16 }}>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: 4, textTransform: "uppercase" }}>Seller Net Proceeds</div>
                    <div style={{ fontSize: "2.2rem", fontWeight: 800, color: netSheetResult.net_proceeds>0?"#4ade80":"#f87171" }}>${netSheetResult.net_proceeds.toLocaleString()}</div>
                    <div style={{ color: "#64748b", fontSize: "0.8rem" }}>{netSheetResult.net_pct}% of sale price</div>
                  </div>
                  <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[{label:"Sale Price",value:`$${netSheetResult.sale_price.toLocaleString()}`,color:"#fff"},{label:"Commission",value:`-$${netSheetResult.commission_amount.toLocaleString()}`,color:"#f87171"},{label:"Closing Costs",value:`-$${netSheetResult.closing_cost_amount.toLocaleString()}`,color:"#f87171"},{label:"Mortgage Payoff",value:`-$${netSheetResult.mortgage_balance.toLocaleString()}`,color:"#f87171"},{label:"Repairs",value:`-$${netSheetResult.repairs.toLocaleString()}`,color:"#f87171"},{label:"Total Deductions",value:`-$${netSheetResult.total_deductions.toLocaleString()}`,color:"#f87171"}].map((item,i) => (
                      <StatBox key={i} label={item.label} value={item.value} color={item.color} />
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {activeTool === "price-drop" && (
            <Card title="📉 Price Drop Alert" subtitle="Generate social media and email content for price reductions">
              <Row><Field label="Address"><Input placeholder="123 Oak St, Nashville TN" value={priceDropForm.address} onChange={e => setPriceDropForm({...priceDropForm, address: e.target.value})} /></Field><Field label="Original Price"><Input placeholder="$425,000" value={priceDropForm.original_price} onChange={e => setPriceDropForm({...priceDropForm, original_price: e.target.value})} /></Field><Field label="New Price"><Input placeholder="$399,000" value={priceDropForm.new_price} onChange={e => setPriceDropForm({...priceDropForm, new_price: e.target.value})} /></Field></Row>
              <Row><Field label="Beds"><Input type="number" placeholder="3" value={priceDropForm.bedrooms} onChange={e => setPriceDropForm({...priceDropForm, bedrooms: e.target.value})} /></Field><Field label="Baths"><Input type="number" placeholder="2" value={priceDropForm.bathrooms} onChange={e => setPriceDropForm({...priceDropForm, bathrooms: e.target.value})} /></Field><Field label="Sqft"><Input type="number" placeholder="1850" value={priceDropForm.sqft} onChange={e => setPriceDropForm({...priceDropForm, sqft: e.target.value})} /></Field></Row>
              <Field label="Key Features" full><Input placeholder="Pool, updated kitchen, 2-car garage..." value={priceDropForm.key_features} onChange={e => setPriceDropForm({...priceDropForm, key_features: e.target.value})} /></Field>
              <BtnRow><Btn onClick={handlePriceDrop} loading={priceDropLoading} label="Generate Alert" /><ClearBtn onClick={() => { setPriceDropForm({address:"",original_price:"",new_price:"",bedrooms:"",bathrooms:"",sqft:"",key_features:"",tone:"professional"}); setPriceDropResult(null); }} /></BtnRow>
              {priceDropResult && (
                <div style={{ marginTop: 16 }}>
                  {priceDropResult.drop_amount && <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid #22c55e", borderRadius: 10, padding: "10px", marginBottom: 12, textAlign: "center" }}><span style={{ color: "#4ade80", fontWeight: 700 }}>📉 Drop: ${priceDropResult.drop_amount.toLocaleString()} ({priceDropResult.drop_pct}% off)</span></div>}
                  <Result value={priceDropResult.result} />
                </div>
              )}
            </Card>
          )}

          {activeTool === "neighborhood-bio" && (
            <Card title="📍 Neighborhood Bio Generator" subtitle="Write short and long neighborhood descriptions for listings">
              <Row><Field label="Neighborhood"><Input placeholder="East Nashville" value={neighborhoodForm.neighborhood} onChange={e => setNeighborhoodForm({...neighborhoodForm, neighborhood: e.target.value})} /></Field><Field label="City"><Input placeholder="Nashville" value={neighborhoodForm.city} onChange={e => setNeighborhoodForm({...neighborhoodForm, city: e.target.value})} /></Field><Field label="State"><Input placeholder="TN" value={neighborhoodForm.state} onChange={e => setNeighborhoodForm({...neighborhoodForm, state: e.target.value})} /></Field></Row>
              <Field label="Highlights" full><Input placeholder="Great schools, walkable, trendy restaurants..." value={neighborhoodForm.highlights} onChange={e => setNeighborhoodForm({...neighborhoodForm, highlights: e.target.value})} /></Field>
              <Field label="Target Buyer" full><Select value={neighborhoodForm.target_buyer} onChange={e => setNeighborhoodForm({...neighborhoodForm, target_buyer: e.target.value})}><option value="families">Families</option><option value="young professionals">Young Professionals</option><option value="retirees">Retirees</option><option value="investors">Investors</option><option value="first-time buyers">First-time Buyers</option></Select></Field>
              <BtnRow><Btn onClick={handleNeighborhoodBio} loading={neighborhoodLoading} label="Generate Bio" /><ClearBtn onClick={() => { setNeighborhoodForm({neighborhood:"",city:"",state:"",highlights:"",target_buyer:"families"}); setNeighborhoodResult(""); }} /></BtnRow>
              {neighborhoodResult && <Result value={neighborhoodResult} />}
            </Card>
          )}

          {activeTool === "demographics" && (
            <Card title="🏘️ Neighborhood Demographics" subtitle="Pull real U.S. Census data for any ZIP code">
              <Field label="ZIP Code" full><Input placeholder="Enter ZIP code (e.g. 61109)" value={censusZip} onChange={e => setCensusZip(e.target.value)} /></Field>
              <BtnRow><Btn onClick={handleCensus} loading={censusLoading} label="Get Demographics" /><ClearBtn onClick={() => { setCensusZip(""); setCensusResult(null); }} /></BtnRow>
              {censusResult && (
                <div style={{ marginTop: 20 }}>
                  <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
                    {[{label:"Median Income",value:`$${censusResult.median_income.toLocaleString()}`,color:"#4ade80"},{label:"Home Value",value:`$${censusResult.median_home_value.toLocaleString()}`,color:"#3b82f6"},{label:"Population",value:censusResult.population.toLocaleString(),color:"#fff"},{label:"Median Age",value:censusResult.median_age,color:"#fff"},{label:"Owner Occupied",value:`${censusResult.owner_pct}%`,color:"#4ade80"},{label:"Renter Occupied",value:`${censusResult.renter_pct}%`,color:"#f97316"},{label:"ZIP Code",value:censusResult.zip_code,color:"#64748b"},{label:"Area",value:censusResult.name?.split(",")[0],color:"#64748b"}].map((item,i) => (
                      <StatBox key={i} label={item.label} value={item.value} color={item.color} />
                    ))}
                  </div>
                  <Result value={censusResult.summary} label="AI SUMMARY" />
                </div>
              )}
            </Card>
          )}

          {activeTool === "referral" && (
            <Card title="🤝 Refer & Earn" subtitle="Earn 10 bonus generations for every agent you refer">
              <Btn onClick={fetchReferralStats} loading={false} label="Get My Referral Link" />
              {showReferral && referralStats && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ background: "#080c14", borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid #1e2a3a" }}>
                    <div style={{ fontSize: "0.68rem", color: "#334155", marginBottom: 6, textTransform: "uppercase" }}>Your Referral Link</div>
                    <div style={{ color: "#3b82f6", fontSize: "0.85rem", wordBreak: "break-all", marginBottom: 10 }}>{referralStats.referral_link}</div>
                    <CopyBtn value={referralStats.referral_link} label="📋 Copy Link" />
                  </div>
                  <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <StatBox label="Total Referrals" value={referralStats.total_referrals} color="#4ade80" />
                    <StatBox label="Bonus Generations" value={referralStats.bonus_generations_earned} color="#facc15" />
                  </div>
                </div>
              )}
            </Card>
          )}

          {activeTool === "history" && (
            <Card title="📋 History" subtitle="Your last 10 generations">
              {history.length === 0 ? (
                <p style={{ color: "#334155", textAlign: "center", padding: "40px 0" }}>No history yet — generate something!</p>
              ) : history.map((item, i) => (
                <div key={i} style={{ borderBottom: "1px solid #1e2a3a", paddingBottom: 16, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: "#3b82f6", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                    {item.type === "marketing_content" ? "📣 Marketing" : item.type === "lead_reply" ? "💬 Lead Reply" : item.type === "listing_description" ? "🏠 Listing" : item.type === "lead_score" ? "🎯 Lead Score" : item.type === "objection_handler" ? "🛡️ Objection" : item.type === "drip_emails" ? "📧 Drip Emails" : item.type === "price_drop_alert" ? "📉 Price Drop" : item.type === "neighborhood_bio" ? "📍 Neighborhood" : item.type === "neighborhood_demographics" ? "🏘️ Demographics" : "📋 Other"}
                  </div>
                  <p style={{ color: "#64748b", fontSize: "0.85rem", margin: "0 0 8px" }}>{item.result?.slice(0, 150)}...</p>
                  <CopyBtn value={item.result} />
                </div>
              ))}
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}

// ===== Reusable Components =====
const Card = ({ title, subtitle, children }) => (
  <div style={{ background: "#0d1117", border: "1px solid #1e2a3a", borderRadius: 16, padding: 28 }}>
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>{title}</h2>
      {subtitle && <p style={{ margin: "6px 0 0", color: "#334155", fontSize: "0.82rem" }}>{subtitle}</p>}
    </div>
    {children}
  </div>
);

const Row = ({ children }) => <div className="row-flex" style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>{children}</div>;
const Field = ({ label, children, full }) => <div style={{ flex: full ? "1 1 100%" : 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 120 }}><label style={{ fontSize: "0.7rem", color: "#334155", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px" }}>{label}</label>{children}</div>;
const BtnRow = ({ children }) => <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>{children}</div>;
const ErrMsg = ({ children }) => <p style={{ color: "#f87171", fontSize: "0.85rem", margin: "8px 0" }}>{children}</p>;

const Input = (props) => <input {...props} style={{ background: "#080c14", border: "1px solid #1e2a3a", borderRadius: 8, padding: "11px 14px", color: "#fff", fontSize: "0.9rem", width: "100%", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.15s", ...props.style }} />;
const Textarea = (props) => <textarea {...props} style={{ background: "#080c14", border: "1px solid #1e2a3a", borderRadius: 8, padding: "11px 14px", color: "#fff", fontSize: "0.9rem", width: "100%", minHeight: 110, resize: "vertical", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" }} />;
const Select = (props) => <select {...props} style={{ background: "#080c14", border: "1px solid #1e2a3a", borderRadius: 8, padding: "11px 14px", color: "#fff", fontSize: "0.9rem", width: "100%", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" }} />;

const Btn = ({ onClick, loading, label }) => (
  <button onClick={onClick} disabled={loading} style={{ background: loading ? "#1e2a3a" : "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#fff", border: "none", borderRadius: 8, padding: "12px 24px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif", transition: "opacity 0.15s" }}>
    {loading ? "⏳ Working..." : label}
  </button>
);

const ClearBtn = ({ onClick }) => (
  <button onClick={onClick} style={{ background: "transparent", color: "#334155", border: "1px solid #1e2a3a", borderRadius: 8, padding: "12px 20px", fontWeight: 500, cursor: "pointer", fontSize: "0.9rem", fontFamily: "'DM Sans', sans-serif" }}>Clear</button>
);

const CopyBtn = ({ value, label = "📋 Copy" }) => (
  <button onClick={() => navigator.clipboard.writeText(value)} style={{ background: "#1e2a3a", color: "#94a3b8", border: "none", borderRadius: 6, padding: "7px 14px", cursor: "pointer", fontSize: "0.8rem", fontFamily: "'DM Sans', sans-serif", marginTop: 8 }}>{label}</button>
);

const Result = ({ value, label }) => (
  <div style={{ marginTop: 16 }}>
    {label && <div style={{ fontSize: "0.68rem", color: "#334155", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.6px" }}>{label}</div>}
    <div style={{ background: "#080c14", borderRadius: 10, padding: 16, color: "#94a3b8", whiteSpace: "pre-wrap", lineHeight: 1.75, fontSize: "0.88rem", border: "1px solid #1e2a3a" }}>{value}</div>
    <CopyBtn value={value} />
  </div>
);

const StatBox = ({ label, value, color }) => (
  <div style={{ background: "#080c14", borderRadius: 10, padding: "12px 14px", border: "1px solid #1e2a3a" }}>
    <div style={{ fontSize: "0.65rem", color: "#334155", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.6px" }}>{label}</div>
    <div style={{ fontSize: "1rem", fontWeight: 700, color: color || "#fff" }}>{value}</div>
  </div>
);

export default App;
