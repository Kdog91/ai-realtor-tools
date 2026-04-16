import { useEffect, useState } from "react";
import "./App.css";

const API = "https://ai-realtor-tools-production.up.railway.app";

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Something went wrong");
      localStorage.setItem("token", data.token);
      localStorage.setItem("plan", data.plan);
      localStorage.setItem("email", data.email);
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.authWrapper}>
      <div style={styles.authBox}>
        <h1 style={styles.authTitle}>🚀 AI Realtor Tools</h1>
        <p style={styles.authSub}>{mode === "login" ? "Sign in to your account" : "Create a free account"}</p>
        <input style={styles.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={styles.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        {error && <p style={styles.error}>{error}</p>}
        <button style={styles.btnPrimary} onClick={handleSubmit} disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>
        <p style={styles.switchText}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <span style={styles.switchLink} onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
            {mode === "login" ? "Sign up free" : "Sign in"}
          </span>
        </p>
        <div style={styles.planBadge}>✅ Free: 5 generations &nbsp;|&nbsp; Pro: 200/mo ($29) &nbsp;|&nbsp; Premium: Unlimited ($99)</div>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [usageInfo, setUsageInfo] = useState(null);
  const [history, setHistory] = useState([]);

  // Marketing
  const [form, setForm] = useState({ business_type: "", audience: "", details: "", tone: "" });
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Lead Reply
  const [leadForm, setLeadForm] = useState({ lead_message: "", property_type: "", tone: "" });
  const [leadResult, setLeadResult] = useState("");
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState("");

  // Listing
  const [listingForm, setListingForm] = useState({ address: "", bedrooms: "", bathrooms: "", sqft: "", price: "", features: "", tone: "professional" });
  const [listingResult, setListingResult] = useState("");
  const [listingLoading, setListingLoading] = useState(false);
  const [listingError, setListingError] = useState("");

  // Affordability
  const [affordForm, setAffordForm] = useState({ home_price: "", down_payment: "", interest_rate: "", loan_term: "30", annual_income: "", monthly_debts: "" });
  const [affordResult, setAffordResult] = useState(null);

  // Market Snapshot
  const [marketForm, setMarketForm] = useState({ zip_code: "", avg_list_price: "", avg_sale_price: "", avg_days_on_market: "", total_listings: "", sold_last_30_days: "", avg_price_per_sqft: "", months_of_inventory: "" });
  const [marketResult, setMarketResult] = useState(null);
  const [marketLoading, setMarketLoading] = useState(false);

  // Lead Scorer
  const [leadScoreForm, setLeadScoreForm] = useState({ lead_name: "", lead_message: "", source: "Zillow", timeframe: "1-3 months", pre_approved: false, has_agent: false });
  const [leadScoreResult, setLeadScoreResult] = useState(null);
  const [leadScoreLoading, setLeadScoreLoading] = useState(false);

  // Objection Handler
  const [objectionForm, setObjectionForm] = useState({ objection: "", objection_type: "seller", context: "" });
  const [objectionResult, setObjectionResult] = useState("");
  const [objectionLoading, setObjectionLoading] = useState(false);

  // Drip Emails
  const [dripForm, setDripForm] = useState({ lead_name: "", lead_type: "buyer", property_interest: "", agent_name: "", tone: "professional" });
  const [dripResult, setDripResult] = useState("");
  const [dripLoading, setDripLoading] = useState(false);

  // Seller Net Sheet
  const [netSheetForm, setNetSheetForm] = useState({ sale_price: "", mortgage_balance: "", agent_commission: "6", closing_costs: "2", repairs: "0", other_fees: "0" });
  const [netSheetResult, setNetSheetResult] = useState(null);

  // Price Drop
  const [priceDropForm, setPriceDropForm] = useState({ address: "", original_price: "", new_price: "", bedrooms: "", bathrooms: "", sqft: "", key_features: "", tone: "professional" });
  const [priceDropResult, setPriceDropResult] = useState(null);
  const [priceDropLoading, setPriceDropLoading] = useState(false);

  // Neighborhood Bio
  const [neighborhoodForm, setNeighborhoodForm] = useState({ neighborhood: "", city: "", state: "", highlights: "", target_buyer: "families" });
  const [neighborhoodResult, setNeighborhoodResult] = useState("");
  const [neighborhoodLoading, setNeighborhoodLoading] = useState(false);

  // Admin
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminStats, setAdminStats] = useState(null);

  // Referral
  const [referralStats, setReferralStats] = useState(null);
  const [showReferral, setShowReferral] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) fetchMe(token);
  }, []);

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
    } catch (err) { console.error("History error:", err); }
  };

  const handleGenerate = async () => {
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${API}/generate`, { method: "POST", headers: authHeaders(), body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error generating content");
      setResult(data.result); fetchHistory(); fetchMe(localStorage.getItem("token"));
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleLeadReply = async () => {
    setLeadError(""); setLeadLoading(true);
    try {
      const res = await fetch(`${API}/lead-reply`, { method: "POST", headers: authHeaders(), body: JSON.stringify(leadForm) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error generating reply");
      setLeadResult(data.result); fetchHistory(); fetchMe(localStorage.getItem("token"));
    } catch (err) { setLeadError(err.message); } finally { setLeadLoading(false); }
  };

  const handleListing = async () => {
    setListingError(""); setListingLoading(true);
    try {
      const res = await fetch(`${API}/listing-description`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ ...listingForm, bedrooms: parseInt(listingForm.bedrooms), bathrooms: parseFloat(listingForm.bathrooms), sqft: parseInt(listingForm.sqft) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error generating listing");
      setListingResult(data.result); fetchHistory(); fetchMe(localStorage.getItem("token"));
    } catch (err) { setListingError(err.message); } finally { setListingLoading(false); }
  };

  const handleAffordability = async () => {
    try {
      const res = await fetch(`${API}/affordability`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ home_price: parseFloat(affordForm.home_price), down_payment: parseFloat(affordForm.down_payment), interest_rate: parseFloat(affordForm.interest_rate), loan_term: parseInt(affordForm.loan_term), annual_income: parseFloat(affordForm.annual_income), monthly_debts: parseFloat(affordForm.monthly_debts || 0) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setAffordResult(data);
    } catch (err) { alert(err.message); }
  };

  const handleMarketSnapshot = async () => {
    setMarketLoading(true);
    try {
      const res = await fetch(`${API}/market-snapshot`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ zip_code: marketForm.zip_code, avg_list_price: parseFloat(marketForm.avg_list_price), avg_sale_price: parseFloat(marketForm.avg_sale_price), avg_days_on_market: parseFloat(marketForm.avg_days_on_market), total_listings: parseInt(marketForm.total_listings), sold_last_30_days: parseInt(marketForm.sold_last_30_days), avg_price_per_sqft: parseFloat(marketForm.avg_price_per_sqft), months_of_inventory: parseFloat(marketForm.months_of_inventory) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setMarketResult(data);
    } catch (err) { alert(err.message); } finally { setMarketLoading(false); }
  };

  const handleLeadScore = async () => {
    setLeadScoreLoading(true);
    try {
      const res = await fetch(`${API}/lead-score`, { method: "POST", headers: authHeaders(), body: JSON.stringify(leadScoreForm) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setLeadScoreResult(data); fetchMe(localStorage.getItem("token"));
    } catch (err) { alert(err.message); } finally { setLeadScoreLoading(false); }
  };

  const handleObjection = async () => {
    setObjectionLoading(true);
    try {
      const res = await fetch(`${API}/objection-handler`, { method: "POST", headers: authHeaders(), body: JSON.stringify(objectionForm) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setObjectionResult(data.result); fetchMe(localStorage.getItem("token"));
    } catch (err) { alert(err.message); } finally { setObjectionLoading(false); }
  };

  const handleDripEmails = async () => {
    setDripLoading(true);
    try {
      const res = await fetch(`${API}/drip-emails`, { method: "POST", headers: authHeaders(), body: JSON.stringify(dripForm) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setDripResult(data.result); fetchMe(localStorage.getItem("token"));
    } catch (err) { alert(err.message); } finally { setDripLoading(false); }
  };

  const handleNetSheet = async () => {
    try {
      const res = await fetch(`${API}/seller-net-sheet`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ sale_price: parseFloat(netSheetForm.sale_price), mortgage_balance: parseFloat(netSheetForm.mortgage_balance), agent_commission: parseFloat(netSheetForm.agent_commission), closing_costs: parseFloat(netSheetForm.closing_costs), repairs: parseFloat(netSheetForm.repairs || 0), other_fees: parseFloat(netSheetForm.other_fees || 0) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setNetSheetResult(data);
    } catch (err) { alert(err.message); }
  };

  const handlePriceDrop = async () => {
    setPriceDropLoading(true);
    try {
      const res = await fetch(`${API}/price-drop-alert`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ ...priceDropForm, bedrooms: parseInt(priceDropForm.bedrooms), bathrooms: parseFloat(priceDropForm.bathrooms), sqft: parseInt(priceDropForm.sqft) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setPriceDropResult(data); fetchMe(localStorage.getItem("token"));
    } catch (err) { alert(err.message); } finally { setPriceDropLoading(false); }
  };

  const handleNeighborhoodBio = async () => {
    setNeighborhoodLoading(true);
    try {
      const res = await fetch(`${API}/neighborhood-bio`, { method: "POST", headers: authHeaders(), body: JSON.stringify(neighborhoodForm) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setNeighborhoodResult(data.result); fetchMe(localStorage.getItem("token"));
    } catch (err) { alert(err.message); } finally { setNeighborhoodLoading(false); }
  };

  const fetchAdminStats = async () => {
    try {
      const res = await fetch(`${API}/admin/stats`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setAdminStats(data); setShowAdmin(true);
    } catch (err) { alert("Admin access only"); }
  };

  const fetchReferralStats = async () => {
    try {
      const res = await fetch(`${API}/referral/stats`, { headers: authHeaders() });
      const data = await res.json();
      setReferralStats(data); setShowReferral(true);
    } catch (err) { alert(err.message); }
  };

  const handleUpgrade = async (plan) => {
    try {
      const res = await fetch(`${API}/create-checkout`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ plan }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      window.location.href = data.url;
    } catch (err) { alert(err.message); }
  };

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div style={styles.wrapper}>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>AI Realtor Tools 🚀</h1>
        <p style={styles.subtitle}>13 AI-powered tools for real estate agents</p>
        <div style={styles.userBar}>
          <span style={styles.userInfo}>
            👤 {user.email} &nbsp;
            <span style={styles.planTag}>{(usageInfo?.plan || "free").toUpperCase()}</span>
            &nbsp; {usageInfo?.usage ?? 0}/{usageInfo?.limit === 999999 ? "∞" : usageInfo?.limit} used
          </span>
          <div style={{display:"flex", gap:8}}>
            {user?.email === "ks427790@gmail.com" && (
              <button style={{...styles.btnSmall, background:"#7c3aed", color:"#fff"}} onClick={showAdmin ? () => setShowAdmin(false) : fetchAdminStats}>📈 Admin</button>
            )}
            <button style={styles.btnSmall} onClick={logout}>Sign Out</button>
          </div>
        </div>
      </div>

      {/* Upgrade Banner */}
      {usageInfo && usageInfo.plan === "free" && (
        <div style={{background:"#161b27", borderBottom:"1px solid #2a2f3e", padding:"16px 40px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12}}>
          <div>
            <span style={{color:"#cdd6f4", fontWeight:600}}>You're on the Free plan</span>
            <span style={{color:"#8892a4", fontSize:"0.85rem", marginLeft:8}}>{usageInfo.usage}/{usageInfo.limit} generations used this month</span>
          </div>
          <div style={{display:"flex", gap:10}}>
            <button style={{background:"#3b82f6", color:"#fff", border:"none", borderRadius:8, padding:"10px 20px", fontWeight:700, cursor:"pointer"}} onClick={() => handleUpgrade("pro")}>Upgrade to Pro — $29/mo</button>
            <button style={{background:"#7c3aed", color:"#fff", border:"none", borderRadius:8, padding:"10px 20px", fontWeight:700, cursor:"pointer"}} onClick={() => handleUpgrade("premium")}>Premium — $99/mo</button>
          </div>
        </div>
      )}

      {/* Admin Dashboard */}
      {showAdmin && adminStats && (
        <div style={{...styles.card, border:"1px solid #7c3aed"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20}}>
            <h2 style={styles.cardTitle}>📈 Admin Dashboard</h2>
            <button style={styles.btnSmall} onClick={() => setShowAdmin(false)}>Close</button>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16}}>
            {[
              {label:"Monthly Revenue", value:`$${adminStats.mrr}`, color:"#4ade80"},
              {label:"Total Users", value:adminStats.total_users, color:"#cdd6f4"},
              {label:"Pro Users", value:adminStats.pro_users, color:"#3b82f6"},
              {label:"Premium Users", value:adminStats.premium_users, color:"#7c3aed"},
              {label:"Free Users", value:adminStats.free_users, color:"#8892a4"},
              {label:"Total Generations", value:adminStats.total_generations, color:"#cdd6f4"},
              {label:"Pro MRR", value:`$${adminStats.pro_users*29}`, color:"#3b82f6"},
              {label:"Premium MRR", value:`$${adminStats.premium_users*99}`, color:"#7c3aed"},
            ].map((item,i) => (
              <div key={i} style={{background:"#0f1117", borderRadius:8, padding:"12px 14px"}}>
                <div style={{fontSize:"0.75rem", color:"#8892a4", marginBottom:4}}>{item.label}</div>
                <div style={{fontSize:"1.1rem", fontWeight:700, color:item.color}}>{item.value}</div>
              </div>
            ))}
          </div>
          <div style={{background:"#0f1117", borderRadius:10, padding:16}}>
            <div style={{fontSize:"0.85rem", color:"#8892a4", marginBottom:12, fontWeight:600}}>RECENT SIGNUPS</div>
            {adminStats.recent_users.map((u,i) => (
              <div key={i} style={{display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #2a2f3e"}}>
                <span style={{color:"#cdd6f4", fontSize:"0.85rem"}}>{u.email}</span>
                <div style={{display:"flex", gap:12}}>
                  <span style={{fontSize:"0.75rem", fontWeight:700, padding:"2px 8px", borderRadius:4, background:u.plan==="premium"?"#7c3aed22":u.plan==="pro"?"#3b82f622":"#2a2f3e", color:u.plan==="premium"?"#a78bfa":u.plan==="pro"?"#60a5fa":"#8892a4"}}>{u.plan?.toUpperCase()}</span>
                  <span style={{color:"#8892a4", fontSize:"0.75rem"}}>{u.monthly_usage||0} uses</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Marketing Generator */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📣 Create Marketing Content</h2>
        <div style={styles.row}>
          <div style={styles.field}><label style={styles.label}>Business Type</label><input style={styles.input} placeholder="Gym, barber, realtor..." value={form.business_type} onChange={(e) => setForm({...form, business_type: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Audience</label><input style={styles.input} placeholder="Young adults, moms, buyers..." value={form.audience} onChange={(e) => setForm({...form, audience: e.target.value})} /></div>
        </div>
        <div style={styles.fieldFull}><label style={styles.label}>Details</label><input style={styles.input} placeholder="Promo, discount, open house..." value={form.details} onChange={(e) => setForm({...form, details: e.target.value})} /></div>
        <div style={styles.fieldFull}><label style={styles.label}>Tone</label><input style={styles.input} placeholder="Exciting, professional, friendly..." value={form.tone} onChange={(e) => setForm({...form, tone: e.target.value})} /></div>
        {error && <p style={styles.error}>{error}</p>}
        <div style={styles.btnRow}>
          <button style={styles.btnPrimary} onClick={handleGenerate} disabled={loading}>{loading ? "Generating..." : "Generate Content"}</button>
          <button style={styles.btnSecondary} onClick={() => { setForm({business_type:"",audience:"",details:"",tone:""}); setResult(""); }}>Clear</button>
        </div>
        {result && <div style={{marginTop:16}}><div style={styles.resultBox}>{result}</div><button style={styles.btnSmall} onClick={() => navigator.clipboard.writeText(result)}>📋 Copy</button></div>}
      </div>

      {/* Lead Reply */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>💬 Lead Reply Generator</h2>
        <div style={styles.fieldFull}><label style={styles.label}>Lead Message</label><textarea style={styles.textarea} placeholder="Hi, I saw your listing..." value={leadForm.lead_message} onChange={(e) => setLeadForm({...leadForm, lead_message: e.target.value})} /></div>
        <div style={styles.row}>
          <div style={styles.field}><label style={styles.label}>Property Type</label><input style={styles.input} placeholder="Single-family, condo..." value={leadForm.property_type} onChange={(e) => setLeadForm({...leadForm, property_type: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Tone</label><input style={styles.input} placeholder="Professional, friendly..." value={leadForm.tone} onChange={(e) => setLeadForm({...leadForm, tone: e.target.value})} /></div>
        </div>
        {leadError && <p style={styles.error}>{leadError}</p>}
        <div style={styles.btnRow}>
          <button style={styles.btnPrimary} onClick={handleLeadReply} disabled={leadLoading}>{leadLoading ? "Generating..." : "Generate Reply"}</button>
          <button style={styles.btnSecondary} onClick={() => { setLeadForm({lead_message:"",property_type:"",tone:""}); setLeadResult(""); }}>Clear</button>
        </div>
        {leadResult && <div style={{marginTop:16}}><div style={styles.resultBox}>{leadResult}</div><button style={styles.btnSmall} onClick={() => navigator.clipboard.writeText(leadResult)}>📋 Copy</button></div>}
      </div>

      {/* Listing Description */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🏠 Listing Description Generator</h2>
        <div style={styles.row}>
          <div style={styles.field}><label style={styles.label}>Address / Area</label><input style={styles.input} placeholder="123 Oak St, Austin TX..." value={listingForm.address} onChange={(e) => setListingForm({...listingForm, address: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Price</label><input style={styles.input} placeholder="$425,000" value={listingForm.price} onChange={(e) => setListingForm({...listingForm, price: e.target.value})} /></div>
        </div>
        <div style={styles.row}>
          <div style={styles.field}><label style={styles.label}>Bedrooms</label><input style={styles.input} type="number" placeholder="3" value={listingForm.bedrooms} onChange={(e) => setListingForm({...listingForm, bedrooms: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Bathrooms</label><input style={styles.input} type="number" placeholder="2.5" value={listingForm.bathrooms} onChange={(e) => setListingForm({...listingForm, bathrooms: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Sqft</label><input style={styles.input} type="number" placeholder="1850" value={listingForm.sqft} onChange={(e) => setListingForm({...listingForm, sqft: e.target.value})} /></div>
        </div>
        <div style={styles.fieldFull}><label style={styles.label}>Key Features</label><input style={styles.input} placeholder="Pool, granite counters, 2-car garage..." value={listingForm.features} onChange={(e) => setListingForm({...listingForm, features: e.target.value})} /></div>
        <div style={styles.fieldFull}><label style={styles.label}>Tone</label>
          <select style={styles.input} value={listingForm.tone} onChange={(e) => setListingForm({...listingForm, tone: e.target.value})}>
            <option value="professional">Professional</option>
            <option value="luxury">Luxury / High-end</option>
            <option value="friendly">Warm & Friendly</option>
            <option value="investment">Investment focused</option>
          </select>
        </div>
        {listingError && <p style={styles.error}>{listingError}</p>}
        <div style={styles.btnRow}>
          <button style={styles.btnPrimary} onClick={handleListing} disabled={listingLoading}>{listingLoading ? "Writing..." : "Generate Listing"}</button>
          <button style={styles.btnSecondary} onClick={() => { setListingForm({address:"",bedrooms:"",bathrooms:"",sqft:"",price:"",features:"",tone:"professional"}); setListingResult(""); }}>Clear</button>
        </div>
        {listingResult && <div style={{marginTop:16}}><div style={styles.resultBox}>{listingResult}</div><button style={styles.btnSmall} onClick={() => navigator.clipboard.writeText(listingResult)}>📋 Copy</button></div>}
      </div>

      {/* Affordability Calculator */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>💰 Buyer Affordability Calculator</h2>
        <div style={styles.row}>
          <div style={styles.field}><label style={styles.label}>Home Price ($)</label><input style={styles.input} type="number" placeholder="450000" value={affordForm.home_price} onChange={(e) => setAffordForm({...affordForm, home_price: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Down Payment ($)</label><input style={styles.input} type="number" placeholder="90000" value={affordForm.down_payment} onChange={(e) => setAffordForm({...affordForm, down_payment: e.target.value})} /></div>
        </div>
        <div style={styles.row}>
          <div style={styles.field}><label style={styles.label}>Interest Rate (%)</label><input style={styles.input} type="number" step="0.1" placeholder="6.8" value={affordForm.interest_rate} onChange={(e) => setAffordForm({...affordForm, interest_rate: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Loan Term</label>
            <select style={styles.input} value={affordForm.loan_term} onChange={(e) => setAffordForm({...affordForm, loan_term: e.target.value})}>
              <option value="30">30 years</option><option value="20">20 years</option><option value="15">15 years</option>
            </select>
          </div>
        </div>
        <div style={styles.row}>
          <div style={styles.field}><label style={styles.label}>Annual Income ($)</label><input style={styles.input} type="number" placeholder="95000" value={affordForm.annual_income} onChange={(e) => setAffordForm({...affordForm, annual_income: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Monthly Debts ($)</label><input style={styles.input} type="number" placeholder="400" value={affordForm.monthly_debts} onChange={(e) => setAffordForm({...affordForm, monthly_debts: e.target.value})} /></div>
        </div>
        <div style={styles.btnRow}>
          <button style={styles.btnPrimary} onClick={handleAffordability}>Calculate</button>
          <button style={styles.btnSecondary} onClick={() => { setAffordForm({home_price:"",down_payment:"",interest_rate:"",loan_term:"30",annual_income:"",monthly_debts:""}); setAffordResult(null); }}>Clear</button>
        </div>
        {affordResult && (
          <div style={{marginTop:16, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
            {[
              {label:"Monthly P&I", value:`$${affordResult.monthly_payment.toLocaleString()}`},
              {label:"Tax & Insurance (est.)", value:`$${affordResult.est_tax_insurance.toLocaleString()}`},
              {label:"Total Monthly Payment", value:`$${affordResult.total_monthly.toLocaleString()}`},
              {label:"Down Payment %", value:`${affordResult.down_payment_pct}%`},
              {label:"Debt-to-Income Ratio", value:`${affordResult.dti_ratio}%`},
              {label:"DTI Status", value:affordResult.dti_status.toUpperCase(), color:affordResult.dti_status==="strong"?"#4ade80":affordResult.dti_status==="acceptable"?"#facc15":"#f87171"},
              {label:"Max Recommended Price", value:`$${Math.round(affordResult.max_recommended_price).toLocaleString()}`},
              {label:"Loan Amount", value:`$${affordResult.loan_amount.toLocaleString()}`},
            ].map((item,i) => (
              <div key={i} style={{background:"#0f1117", borderRadius:8, padding:"12px 16px"}}>
                <div style={{fontSize:"0.78rem", color:"#8892a4", marginBottom:4}}>{item.label}</div>
                <div style={{fontSize:"1.1rem", fontWeight:700, color:item.color||"#cdd6f4"}}>{item.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Market Snapshot */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📊 Market Snapshot Generator</h2>
        <p style={{color:"#8892a4", fontSize:"0.85rem", marginTop:-12, marginBottom:16}}>Enter your local MLS data to generate a client-ready market report.</p>
        <div style={styles.row}>
          <div style={styles.field}><label style={styles.label}>ZIP Code</label><input style={styles.input} placeholder="37201" value={marketForm.zip_code} onChange={(e) => setMarketForm({...marketForm, zip_code: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Avg List Price ($)</label><input style={styles.input} type="number" placeholder="425000" value={marketForm.avg_list_price} onChange={(e) => setMarketForm({...marketForm, avg_list_price: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Avg Sale Price ($)</label><input style={styles.input} type="number" placeholder="418000" value={marketForm.avg_sale_price} onChange={(e) => setMarketForm({...marketForm, avg_sale_price: e.target.value})} /></div>
        </div>
        <div style={styles.row}>
          <div style={styles.field}><label style={styles.label}>Avg Days on Market</label><input style={styles.input} type="number" placeholder="21" value={marketForm.avg_days_on_market} onChange={(e) => setMarketForm({...marketForm, avg_days_on_market: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Total Active Listings</label><input style={styles.input} type="number" placeholder="145" value={marketForm.total_listings} onChange={(e) => setMarketForm({...marketForm, total_listings: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Sold Last 30 Days</label><input style={styles.input} type="number" placeholder="48" value={marketForm.sold_last_30_days} onChange={(e) => setMarketForm({...marketForm, sold_last_30_days: e.target.value})} /></div>
        </div>
        <div style={styles.row}>
          <div style={styles.field}><label style={styles.label}>Avg Price Per Sqft ($)</label><input style={styles.input} type="number" placeholder="198" value={marketForm.avg_price_per_sqft} onChange={(e) => setMarketForm({...marketForm, avg_price_per_sqft: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Months of Inventory</label><input style={styles.input} type="number" step="0.1" placeholder="2.8" value={marketForm.months_of_inventory} onChange={(e) => setMarketForm({...marketForm, months_of_inventory: e.target.value})} /></div>
        </div>
        <div style={styles.btnRow}>
          <button style={styles.btnPrimary} onClick={handleMarketSnapshot} disabled={marketLoading}>{marketLoading ? "Generating..." : "Generate Snapshot"}</button>
          <button style={styles.btnSecondary} onClick={() => { setMarketForm({zip_code:"",avg_list_price:"",avg_sale_price:"",avg_days_on_market:"",total_listings:"",sold_last_30_days:"",avg_price_per_sqft:"",months_of_inventory:""}); setMarketResult(null); }}>Clear</button>
        </div>
        {marketResult && (
          <div style={{marginTop:20}}>
            <div style={{background:marketResult.market_color==="red"?"#ef444422":marketResult.market_color==="orange"?"#f9731622":marketResult.market_color==="green"?"#22c55e22":"#3b82f622", border:`1px solid ${marketResult.market_color==="red"?"#ef4444":marketResult.market_color==="orange"?"#f97316":marketResult.market_color==="green"?"#22c55e":"#3b82f6"}`, borderRadius:10, padding:"14px 20px", marginBottom:16, textAlign:"center"}}>
              <div style={{fontSize:"1.4rem", fontWeight:800, color:marketResult.market_color==="red"?"#ef4444":marketResult.market_color==="orange"?"#f97316":marketResult.market_color==="green"?"#22c55e":"#3b82f6"}}>{marketResult.market_type}</div>
              <div style={{color:"#8892a4", fontSize:"0.85rem", marginTop:4}}>ZIP {marketResult.zip_code}</div>
            </div>
            <div style={{background:"#0f1117", borderRadius:10, padding:20, marginBottom:16}}>
              <p style={{color:"#cdd6f4", lineHeight:1.7, margin:0, fontSize:"0.9rem"}}>{marketResult.summary}</p>
              <button style={{...styles.btnSmall, marginTop:12}} onClick={() => navigator.clipboard.writeText(marketResult.summary)}>📋 Copy Summary</button>
            </div>
          </div>
        )}
      </div>

      {/* Lead Scorer */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🎯 Lead Scorer</h2>
        <p style={{color:"#8892a4", fontSize:"0.85rem", marginTop:-12, marginBottom:16}}>AI scores your lead's intent and tells you exactly what to do next.</p>
        <div style={styles.row}>
          <div style={styles.field}><label style={styles.label}>Lead Name</label><input style={styles.input} placeholder="John Smith" value={leadScoreForm.lead_name} onChange={(e) => setLeadScoreForm({...leadScoreForm, lead_name: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Lead Source</label>
            <select style={styles.input} value={leadScoreForm.source} onChange={(e) => setLeadScoreForm({...leadScoreForm, source: e.target.value})}>
              <option>Zillow</option><option>Realtor.com</option><option>Facebook</option><option>Instagram</option><option>Referral</option><option>Cold Call</option><option>Open House</option><option>Website</option>
            </select>
          </div>
          <div style={styles.field}><label style={styles.label}>Buying Timeframe</label>
            <select style={styles.input} value={leadScoreForm.timeframe} onChange={(e) => setLeadScoreForm({...leadScoreForm, timeframe: e.target.value})}>
              <option>ASAP</option><option>1-3 months</option><option>3-6 months</option><option>6-12 months</option><option>Just browsing</option>
            </select>
          </div>
        </div>
        <div style={styles.fieldFull}><label style={styles.label}>Lead's Message</label><textarea style={styles.textarea} placeholder="Hi, I saw your listing on Zillow..." value={leadScoreForm.lead_message} onChange={(e) => setLeadScoreForm({...leadScoreForm, lead_message: e.target.value})} /></div>
        <div style={{display:"flex", gap:24, marginBottom:16}}>
          <label style={{display:"flex", alignItems:"center", gap:8, color:"#cdd6f4", fontSize:"0.9rem", cursor:"pointer"}}><input type="checkbox" checked={leadScoreForm.pre_approved} onChange={(e) => setLeadScoreForm({...leadScoreForm, pre_approved: e.target.checked})} /> Pre-approved</label>
          <label style={{display:"flex", alignItems:"center", gap:8, color:"#cdd6f4", fontSize:"0.9rem", cursor:"pointer"}}><input type="checkbox" checked={leadScoreForm.has_agent} onChange={(e) => setLeadScoreForm({...leadScoreForm, has_agent: e.target.checked})} /> Already has an agent</label>
        </div>
        <div style={styles.btnRow}>
          <button style={styles.btnPrimary} onClick={handleLeadScore} disabled={leadScoreLoading}>{leadScoreLoading ? "Scoring..." : "Score This Lead"}</button>
          <button style={styles.btnSecondary} onClick={() => { setLeadScoreForm({lead_name:"",lead_message:"",source:"Zillow",timeframe:"1-3 months",pre_approved:false,has_agent:false}); setLeadScoreResult(null); }}>Clear</button>
        </div>
        {leadScoreResult && (
          <div style={{marginTop:20}}>
            <div style={{display:"flex", gap:16, marginBottom:16}}>
              <div style={{background:"#0f1117", borderRadius:10, padding:20, textAlign:"center", minWidth:120}}>
                <div style={{fontSize:"0.75rem", color:"#8892a4", marginBottom:6}}>LEAD SCORE</div>
                <div style={{fontSize:"3rem", fontWeight:800, color:leadScoreResult.score>=8?"#4ade80":leadScoreResult.score>=5?"#facc15":"#f87171"}}>{leadScoreResult.score}</div>
                <div style={{fontSize:"0.75rem", color:"#8892a4"}}>/10</div>
              </div>
              <div style={{flex:1, display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
                <div style={{background:"#0f1117", borderRadius:8, padding:"12px 16px"}}><div style={{fontSize:"0.75rem", color:"#8892a4", marginBottom:4}}>TEMPERATURE</div><div style={{fontSize:"1rem", fontWeight:700, color:leadScoreResult.temperature==="Hot"?"#ef4444":leadScoreResult.temperature==="Warm"?"#f97316":"#3b82f6"}}>{leadScoreResult.temperature}</div></div>
                <div style={{background:"#0f1117", borderRadius:8, padding:"12px 16px"}}><div style={{fontSize:"0.75rem", color:"#8892a4", marginBottom:4}}>PRIORITY</div><div style={{fontSize:"1rem", fontWeight:700, color:leadScoreResult.priority==="Urgent"?"#ef4444":leadScoreResult.priority==="High"?"#f97316":"#facc15"}}>{leadScoreResult.priority}</div></div>
                <div style={{background:"#0f1117", borderRadius:8, padding:"12px 16px", gridColumn:"span 2"}}><div style={{fontSize:"0.75rem", color:"#8892a4", marginBottom:4}}>SUMMARY</div><div style={{fontSize:"0.9rem", color:"#cdd6f4"}}>{leadScoreResult.summary}</div></div>
              </div>
            </div>
            {[{label:"⚡ NEXT ACTION", value:leadScoreResult.next_action, color:"#22c55e"},{label:"⚠️ WATCH OUT FOR", value:leadScoreResult.watch_out, color:"#f87171"}].map((item,i) => (
              <div key={i} style={{background:"#0f1117", borderRadius:10, padding:16, marginBottom:12}}>
                <div style={{fontSize:"0.75rem", color:item.color, marginBottom:6, fontWeight:700}}>{item.label}</div>
                <div style={{fontSize:"0.9rem", color:"#cdd6f4"}}>{item.value}</div>
              </div>
            ))}
            <div style={{background:"#0f1117", borderRadius:10, padding:16}}>
              <div style={{fontSize:"0.75rem", color:"#3b82f6", marginBottom:6, fontWeight:700}}>💬 READY-TO-SEND FOLLOW-UP</div>
              <div style={{fontSize:"0.9rem", color:"#cdd6f4", lineHeight:1.7}}>{leadScoreResult.follow_up}</div>
              <button style={{...styles.btnSmall, marginTop:10}} onClick={() => navigator.clipboard.writeText(leadScoreResult.follow_up)}>📋 Copy Message</button>
            </div>
          </div>
        )}
      </div>

      {/* Objection Handler */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🛡️ Objection Handler</h2>
        <p style={{color:"#8892a4", fontSize:"0.85rem", marginTop:-12, marginBottom:16}}>Type any buyer or seller objection — get a confident ready-to-say response.</p>
        <div style={styles.row}>
          <div style={styles.field}><label style={styles.label}>Objection Type</label>
            <select style={styles.input} value={objectionForm.objection_type} onChange={(e) => setObjectionForm({...objectionForm, objection_type: e.target.value})}>
              <option value="seller">Seller objection</option><option value="buyer">Buyer objection</option><option value="commission">Commission objection</option><option value="price">Price objection</option>
            </select>
          </div>
          <div style={{...styles.field, flex:2}}><label style={styles.label}>The Objection</label><input style={styles.input} placeholder="I want to wait until spring to sell..." value={objectionForm.objection} onChange={(e) => setObjectionForm({...objectionForm, objection: e.target.value})} /></div>
        </div>
        <div style={styles.fieldFull}><label style={styles.label}>Context (optional)</label><input style={styles.input} placeholder="Seller has been on market 45 days..." value={objectionForm.context} onChange={(e) => setObjectionForm({...objectionForm, context: e.target.value})} /></div>
        <div style={styles.btnRow}>
          <button style={styles.btnPrimary} onClick={handleObjection} disabled={objectionLoading}>{objectionLoading ? "Generating..." : "Handle Objection"}</button>
          <button style={styles.btnSecondary} onClick={() => { setObjectionForm({objection:"",objection_type:"seller",context:""}); setObjectionResult(""); }}>Clear</button>
        </div>
        {objectionResult && <div style={{marginTop:16}}><div style={styles.resultBox}>{objectionResult}</div><button style={styles.btnSmall} onClick={() => navigator.clipboard.writeText(objectionResult)}>📋 Copy</button></div>}
      </div>

      {/* Drip Email Writer */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📧 Drip Email Writer</h2>
        <p style={{color:"#8892a4", fontSize:"0.85rem", marginTop:-12, marginBottom:16}}>Generate a 3-email follow-up sequence for any lead.</p>
        <div style={styles.row}>
          <div style={styles.field}><label style={styles.label}>Lead Name</label><input style={styles.input} placeholder="Sarah Johnson" value={dripForm.lead_name} onChange={(e) => setDripForm({...dripForm, lead_name: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Lead Type</label>
            <select style={styles.input} value={dripForm.lead_type} onChange={(e) => setDripForm({...dripForm, lead_type: e.target.value})}>
              <option value="buyer">Buyer</option><option value="seller">Seller</option><option value="investor">Investor</option><option value="renter">Renter looking to buy</option>
            </select>
          </div>
          <div style={styles.field}><label style={styles.label}>Tone</label>
            <select style={styles.input} value={dripForm.tone} onChange={(e) => setDripForm({...dripForm, tone: e.target.value})}>
              <option value="professional">Professional</option><option value="friendly">Friendly</option><option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
        <div style={styles.row}>
          <div style={styles.field}><label style={styles.label}>Property Interest</label><input style={styles.input} placeholder="3bed single family under $450k" value={dripForm.property_interest} onChange={(e) => setDripForm({...dripForm, property_interest: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Your Name</label><input style={styles.input} placeholder="Kevin Simmons" value={dripForm.agent_name} onChange={(e) => setDripForm({...dripForm, agent_name: e.target.value})} /></div>
        </div>
        <div style={styles.btnRow}>
          <button style={styles.btnPrimary} onClick={handleDripEmails} disabled={dripLoading}>{dripLoading ? "Writing..." : "Generate 3 Emails"}</button>
          <button style={styles.btnSecondary} onClick={() => { setDripForm({lead_name:"",lead_type:"buyer",property_interest:"",agent_name:"",tone:"professional"}); setDripResult(""); }}>Clear</button>
        </div>
        {dripResult && <div style={{marginTop:16}}><div style={styles.resultBox}>{dripResult}</div><button style={styles.btnSmall} onClick={() => navigator.clipboard.writeText(dripResult)}>📋 Copy All</button></div>}
      </div>

      {/* Seller Net Sheet */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🧾 Seller Net Sheet</h2>
        <p style={{color:"#8892a4", fontSize:"0.85rem", marginTop:-12, marginBottom:16}}>Show sellers exactly how much they'll walk away with at closing.</p>
        <div style={styles.row}>
          <div style={styles.field}><label style={styles.label}>Sale Price ($)</label><input style={styles.input} type="number" placeholder="450000" value={netSheetForm.sale_price} onChange={(e) => setNetSheetForm({...netSheetForm, sale_price: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Mortgage Balance ($)</label><input style={styles.input} type="number" placeholder="220000" value={netSheetForm.mortgage_balance} onChange={(e) => setNetSheetForm({...netSheetForm, mortgage_balance: e.target.value})} /></div>
        </div>
        <div style={styles.row}>
          <div style={styles.field}><label style={styles.label}>Commission (%)</label><input style={styles.input} type="number" step="0.1" placeholder="6" value={netSheetForm.agent_commission} onChange={(e) => setNetSheetForm({...netSheetForm, agent_commission: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Closing Costs (%)</label><input style={styles.input} type="number" step="0.1" placeholder="2" value={netSheetForm.closing_costs} onChange={(e) => setNetSheetForm({...netSheetForm, closing_costs: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Repairs ($)</label><input style={styles.input} type="number" placeholder="0" value={netSheetForm.repairs} onChange={(e) => setNetSheetForm({...netSheetForm, repairs: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Other Fees ($)</label><input style={styles.input} type="number" placeholder="0" value={netSheetForm.other_fees} onChange={(e) => setNetSheetForm({...netSheetForm, other_fees: e.target.value})} /></div>
        </div>
        <div style={styles.btnRow}>
          <button style={styles.btnPrimary} onClick={handleNetSheet}>Calculate Net</button>
          <button style={styles.btnSecondary} onClick={() => { setNetSheetForm({sale_price:"",mortgage_balance:"",agent_commission:"6",closing_costs:"2",repairs:"0",other_fees:"0"}); setNetSheetResult(null); }}>Clear</button>
        </div>
        {netSheetResult && (
          <div style={{marginTop:16}}>
            <div style={{background:netSheetResult.net_proceeds>0?"#22c55e22":"#ef444422", border:`1px solid ${netSheetResult.net_proceeds>0?"#22c55e":"#ef4444"}`, borderRadius:10, padding:"16px 20px", textAlign:"center", marginBottom:16}}>
              <div style={{fontSize:"0.85rem", color:"#8892a4", marginBottom:4}}>SELLER NET PROCEEDS</div>
              <div style={{fontSize:"2rem", fontWeight:800, color:netSheetResult.net_proceeds>0?"#4ade80":"#f87171"}}>${netSheetResult.net_proceeds.toLocaleString()}</div>
              <div style={{color:"#8892a4", fontSize:"0.85rem"}}>{netSheetResult.net_pct}% of sale price</div>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
              {[
                {label:"Sale Price", value:`$${netSheetResult.sale_price.toLocaleString()}`, color:"#cdd6f4"},
                {label:"Commission", value:`-$${netSheetResult.commission_amount.toLocaleString()}`, color:"#f87171"},
                {label:"Closing Costs", value:`-$${netSheetResult.closing_cost_amount.toLocaleString()}`, color:"#f87171"},
                {label:"Mortgage Payoff", value:`-$${netSheetResult.mortgage_balance.toLocaleString()}`, color:"#f87171"},
                {label:"Repairs", value:`-$${netSheetResult.repairs.toLocaleString()}`, color:"#f87171"},
                {label:"Total Deductions", value:`-$${netSheetResult.total_deductions.toLocaleString()}`, color:"#f87171"},
              ].map((item,i) => (
                <div key={i} style={{background:"#0f1117", borderRadius:8, padding:"10px 14px"}}>
                  <div style={{fontSize:"0.75rem", color:"#8892a4", marginBottom:3}}>{item.label}</div>
                  <div style={{fontSize:"0.95rem", fontWeight:700, color:item.color}}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Price Drop Alert */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📉 Price Drop Alert Generator</h2>
        <p style={{color:"#8892a4", fontSize:"0.85rem", marginTop:-12, marginBottom:16}}>Generate Instagram, Facebook, and email content for a price reduction.</p>
        <div style={styles.row}>
          <div style={styles.field}><label style={styles.label}>Address</label><input style={styles.input} placeholder="123 Oak St, Nashville TN" value={priceDropForm.address} onChange={(e) => setPriceDropForm({...priceDropForm, address: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Original Price</label><input style={styles.input} placeholder="$425,000" value={priceDropForm.original_price} onChange={(e) => setPriceDropForm({...priceDropForm, original_price: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>New Price</label><input style={styles.input} placeholder="$399,000" value={priceDropForm.new_price} onChange={(e) => setPriceDropForm({...priceDropForm, new_price: e.target.value})} /></div>
        </div>
        <div style={styles.row}>
          <div style={styles.field}><label style={styles.label}>Beds</label><input style={styles.input} type="number" placeholder="3" value={priceDropForm.bedrooms} onChange={(e) => setPriceDropForm({...priceDropForm, bedrooms: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Baths</label><input style={styles.input} type="number" placeholder="2" value={priceDropForm.bathrooms} onChange={(e) => setPriceDropForm({...priceDropForm, bathrooms: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>Sqft</label><input style={styles.input} type="number" placeholder="1850" value={priceDropForm.sqft} onChange={(e) => setPriceDropForm({...priceDropForm, sqft: e.target.value})} /></div>
        </div>
        <div style={styles.fieldFull}><label style={styles.label}>Key Features</label><input style={styles.input} placeholder="Pool, updated kitchen, 2-car garage..." value={priceDropForm.key_features} onChange={(e) => setPriceDropForm({...priceDropForm, key_features: e.target.value})} /></div>
        <div style={styles.btnRow}>
          <button style={styles.btnPrimary} onClick={handlePriceDrop} disabled={priceDropLoading}>{priceDropLoading ? "Generating..." : "Generate Alert"}</button>
          <button style={styles.btnSecondary} onClick={() => { setPriceDropForm({address:"",original_price:"",new_price:"",bedrooms:"",bathrooms:"",sqft:"",key_features:"",tone:"professional"}); setPriceDropResult(null); }}>Clear</button>
        </div>
        {priceDropResult && (
          <div style={{marginTop:16}}>
            {priceDropResult.drop_amount && <div style={{background:"#22c55e22", border:"1px solid #22c55e", borderRadius:8, padding:"10px 16px", marginBottom:12, textAlign:"center"}}><span style={{color:"#4ade80", fontWeight:700}}>Price drop: ${priceDropResult.drop_amount.toLocaleString()} ({priceDropResult.drop_pct}% reduction)</span></div>}
            <div style={styles.resultBox}>{priceDropResult.result}</div>
            <button style={styles.btnSmall} onClick={() => navigator.clipboard.writeText(priceDropResult.result)}>📋 Copy</button>
          </div>
        )}
      </div>

      {/* Neighborhood Bio */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📍 Neighborhood Bio Generator</h2>
        <p style={{color:"#8892a4", fontSize:"0.85rem", marginTop:-12, marginBottom:16}}>Generate short and long neighborhood descriptions for listings and your website.</p>
        <div style={styles.row}>
          <div style={styles.field}><label style={styles.label}>Neighborhood</label><input style={styles.input} placeholder="East Nashville" value={neighborhoodForm.neighborhood} onChange={(e) => setNeighborhoodForm({...neighborhoodForm, neighborhood: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>City</label><input style={styles.input} placeholder="Nashville" value={neighborhoodForm.city} onChange={(e) => setNeighborhoodForm({...neighborhoodForm, city: e.target.value})} /></div>
          <div style={styles.field}><label style={styles.label}>State</label><input style={styles.input} placeholder="TN" value={neighborhoodForm.state} onChange={(e) => setNeighborhoodForm({...neighborhoodForm, state: e.target.value})} /></div>
        </div>
        <div style={styles.fieldFull}><label style={styles.label}>Highlights</label><input style={styles.input} placeholder="Great schools, walkable, trendy restaurants..." value={neighborhoodForm.highlights} onChange={(e) => setNeighborhoodForm({...neighborhoodForm, highlights: e.target.value})} /></div>
        <div style={styles.fieldFull}><label style={styles.label}>Target Buyer</label>
          <select style={styles.input} value={neighborhoodForm.target_buyer} onChange={(e) => setNeighborhoodForm({...neighborhoodForm, target_buyer: e.target.value})}>
            <option value="families">Families</option><option value="young professionals">Young professionals</option><option value="retirees">Retirees</option><option value="investors">Investors</option><option value="first-time buyers">First-time buyers</option>
          </select>
        </div>
        <div style={styles.btnRow}>
          <button style={styles.btnPrimary} onClick={handleNeighborhoodBio} disabled={neighborhoodLoading}>{neighborhoodLoading ? "Writing..." : "Generate Bio"}</button>
          <button style={styles.btnSecondary} onClick={() => { setNeighborhoodForm({neighborhood:"",city:"",state:"",highlights:"",target_buyer:"families"}); setNeighborhoodResult(""); }}>Clear</button>
        </div>
        {neighborhoodResult && <div style={{marginTop:16}}><div style={styles.resultBox}>{neighborhoodResult}</div><button style={styles.btnSmall} onClick={() => navigator.clipboard.writeText(neighborhoodResult)}>📋 Copy</button></div>}
      </div>

      {/* Referral System */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🤝 Refer & Earn</h2>
        <p style={{color:"#8892a4", fontSize:"0.85rem", marginTop:-12, marginBottom:16}}>Share your referral link — earn 10 bonus generations for every agent you refer!</p>
        <button style={styles.btnPrimary} onClick={fetchReferralStats}>Get My Referral Link</button>
        {showReferral && referralStats && (
          <div style={{marginTop:16}}>
            <div style={{background:"#0f1117", borderRadius:10, padding:16, marginBottom:12}}>
              <div style={{fontSize:"0.75rem", color:"#8892a4", marginBottom:6}}>YOUR REFERRAL LINK</div>
              <div style={{color:"#3b82f6", fontSize:"0.85rem", wordBreak:"break-all", marginBottom:8}}>{referralStats.referral_link}</div>
              <button style={styles.btnSmall} onClick={() => navigator.clipboard.writeText(referralStats.referral_link)}>📋 Copy Link</button>
            </div>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
              <div style={{background:"#0f1117", borderRadius:8, padding:"12px 14px"}}><div style={{fontSize:"0.75rem", color:"#8892a4", marginBottom:4}}>Total Referrals</div><div style={{fontSize:"1.5rem", fontWeight:700, color:"#4ade80"}}>{referralStats.total_referrals}</div></div>
              <div style={{background:"#0f1117", borderRadius:8, padding:"12px 14px"}}><div style={{fontSize:"0.75rem", color:"#8892a4", marginBottom:4}}>Bonus Generations Earned</div><div style={{fontSize:"1.5rem", fontWeight:700, color:"#facc15"}}>{referralStats.bonus_generations_earned}</div></div>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📋 History</h2>
        {history.length === 0 ? (
          <p style={{color:"#888", textAlign:"center"}}>No history yet. Generate something!</p>
        ) : (
          history.map((item, i) => (
            <div key={i} style={styles.historyItem}>
              <p style={styles.historyType}>
                {item.type === "marketing_content" ? "📣 Marketing" : item.type === "lead_reply" ? "💬 Lead Reply" : item.type === "listing_description" ? "🏠 Listing" : item.type === "lead_score" ? "🎯 Lead Score" : item.type === "objection_handler" ? "🛡️ Objection" : item.type === "drip_emails" ? "📧 Drip Emails" : item.type === "price_drop_alert" ? "📉 Price Drop" : item.type === "neighborhood_bio" ? "📍 Neighborhood" : "📋 Other"}
              </p>
              <p style={styles.historyResult}>{item.result?.slice(0, 150)}...</p>
              <button style={styles.btnSmall} onClick={() => navigator.clipboard.writeText(item.result)}>📋 Copy</button>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

const styles = {
  wrapper: { minHeight: "100vh", background: "#0f1117", color: "#fff", fontFamily: "Inter, sans-serif", padding: "0 0 60px" },
  header: { background: "#161b27", padding: "30px 40px 20px", borderBottom: "1px solid #2a2f3e" },
  title: { fontSize: "2rem", fontWeight: 800, margin: 0, color: "#ffffff" },
  subtitle: { color: "#8892a4", margin: "6px 0 16px" },
  userBar: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  userInfo: { color: "#cdd6f4", fontSize: "0.9rem" },
  planTag: { background: "#3b82f6", color: "#fff", borderRadius: 4, padding: "2px 8px", fontSize: "0.75rem", fontWeight: 700 },
  upgradeBar: { background: "#7c3aed22", border: "1px solid #7c3aed", color: "#c4b5fd", padding: "12px 40px", fontSize: "0.9rem" },
  card: { background: "#161b27", margin: "24px 40px 0", borderRadius: 12, padding: "28px", border: "1px solid #2a2f3e" },
  cardTitle: { fontSize: "1.3rem", fontWeight: 700, marginTop: 0, marginBottom: 20, color: "#ffffff" },
  row: { display: "flex", gap: 16, marginBottom: 16 },
  field: { flex: 1, display: "flex", flexDirection: "column", gap: 6 },
  fieldFull: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 },
  label: { fontSize: "0.85rem", color: "#8892a4" },
  input: { background: "#0f1117", border: "1px solid #2a2f3e", borderRadius: 8, padding: "12px 16px", color: "#fff", fontSize: "0.95rem", width: "100%", boxSizing: "border-box" },
  textarea: { background: "#0f1117", border: "1px solid #2a2f3e", borderRadius: 8, padding: "12px 16px", color: "#fff", fontSize: "0.95rem", width: "100%", minHeight: 120, resize: "vertical", boxSizing: "border-box" },
  btnRow: { display: "flex", gap: 12, marginTop: 8 },
  btnPrimary: { background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "12px 24px", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem" },
  btnSecondary: { background: "#2a2f3e", color: "#fff", border: "none", borderRadius: 8, padding: "12px 24px", fontWeight: 600, cursor: "pointer" },
  btnSmall: { background: "#2a2f3e", color: "#cdd6f4", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: "0.85rem", marginTop: 10 },
  resultBox: { background: "#0f1117", borderRadius: 8, padding: 16, color: "#cdd6f4", whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: "0.9rem" },
  historyItem: { borderBottom: "1px solid #2a2f3e", paddingBottom: 16, marginBottom: 16 },
  historyType: { fontWeight: 700, margin: "0 0 6px", color: "#3b82f6" },
  historyResult: { color: "#8892a4", fontSize: "0.85rem", margin: "0 0 6px" },
  error: { color: "#f87171", fontSize: "0.9rem", margin: "8px 0" },
  authWrapper: { minHeight: "100vh", background: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center" },
  authBox: { background: "#161b27", border: "1px solid #2a2f3e", borderRadius: 16, padding: 40, width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 14 },
  authTitle: { margin: 0, fontSize: "1.6rem", fontWeight: 800, textAlign: "center", color: "#fff" },
  authSub: { margin: 0, color: "#8892a4", textAlign: "center", fontSize: "0.9rem" },
  switchText: { color: "#8892a4", fontSize: "0.85rem", textAlign: "center", margin: 0 },
  switchLink: { color: "#3b82f6", cursor: "pointer", fontWeight: 600 },
  planBadge: { background: "#0f1117", borderRadius: 8, padding: "10px 14px", color: "#8892a4", fontSize: "0.78rem", textAlign: "center" },
};

export default App;