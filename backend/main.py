from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from openai import OpenAI
from pymongo import MongoClient
from passlib.context import CryptContext
from jose import jwt, JWTError
from bson import ObjectId
from datetime import datetime, timedelta
import os
import json
import stripe
import httpx
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
mongo_client = MongoClient(os.getenv("MONGO_URI"))
db = mongo_client[os.getenv("DB_NAME")]
collection = db["generations"]
users_col = db["users"]

JWT_SECRET = os.getenv("JWT_SECRET", "change-this-secret")
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

STRIPE_PRICES = {
    "pro": "price_1TKI26Bw1uMt77JZEvFBkQNY",
    "premium": "price_1TKI6KBw1uMt77JZjdREA2Ov",
    "team_starter": "price_1TQ9emBw1uMt77JZSTAhVkTo",
    "team_pro": "price_1TQ9hFBw1uMt77JZpoz1HzOt"
}

PLAN_LIMITS = {"free": 5, "pro": 200, "premium": 999999, "team_starter": 1000, "team_pro": 999999}
ADMIN_EMAILS = ["ks427790@gmail.com"]

# =========================
# MODELS
# =========================

class RegisterRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ListingRequest(BaseModel):
    business_type: str
    audience: str
    details: str
    tone: str

class LeadReplyRequest(BaseModel):
    lead_message: str
    property_type: str
    tone: str

class ListingDescRequest(BaseModel):
    address: str
    bedrooms: int
    bathrooms: float
    sqft: int
    price: str
    features: str
    tone: str = "professional"

class AffordabilityRequest(BaseModel):
    home_price: float
    down_payment: float
    interest_rate: float
    loan_term: int = 30
    annual_income: float
    monthly_debts: float = 0

class MarketSnapshotRequest(BaseModel):
    zip_code: str
    avg_list_price: float
    avg_sale_price: float
    avg_days_on_market: float
    total_listings: int
    sold_last_30_days: int
    avg_price_per_sqft: float
    months_of_inventory: float

class LeadScorerRequest(BaseModel):
    lead_name: str
    lead_message: str
    source: str
    timeframe: str
    pre_approved: bool = False
    has_agent: bool = False

class CheckoutRequest(BaseModel):
    plan: str

class ObjectionRequest(BaseModel):
    objection: str
    objection_type: str = "seller"
    context: str = ""

class DripEmailRequest(BaseModel):
    lead_name: str
    lead_type: str
    property_interest: str
    agent_name: str
    tone: str = "professional"

class SellerNetSheetRequest(BaseModel):
    sale_price: float
    mortgage_balance: float
    agent_commission: float = 6.0
    closing_costs: float = 2.0
    repairs: float = 0
    other_fees: float = 0

class PriceDropRequest(BaseModel):
    address: str
    original_price: str
    new_price: str
    bedrooms: int
    bathrooms: float
    sqft: int
    key_features: str
    tone: str = "professional"

class NeighborhoodBioRequest(BaseModel):
    neighborhood: str
    city: str
    state: str
    highlights: str
    target_buyer: str = "families"

class ReferralRequest(BaseModel):
    referrer_email: str

class CensusRequest(BaseModel):
    zip_code: str

class TeamInviteRequest(BaseModel):
    email: str

class TeamAcceptRequest(BaseModel):
    invite_code: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

# =========================
# AUTH HELPERS
# =========================

def create_token(user_id: str, plan: str):
    payload = {"sub": user_id, "plan": plan, "exp": datetime.utcnow() + timedelta(days=30)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = users_col.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def require_admin(user=Depends(get_current_user)):
    if user["email"] not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def check_and_increment_usage(user):
    plan = user.get("plan", "free")
    limit = PLAN_LIMITS.get(plan, 5)
    if user.get("monthly_usage", 0) >= limit:
        raise HTTPException(status_code=402, detail=f"Monthly limit of {limit} reached. Upgrade your plan to continue.")
    users_col.update_one({"_id": user["_id"]}, {"$inc": {"monthly_usage": 1}})

# =========================
# AUTH ROUTES
# =========================

@app.post("/register")
def register(req: RegisterRequest):
    if users_col.find_one({"email": req.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    result = users_col.insert_one({
        "email": req.email,
        "hashed_password": pwd_context.hash(req.password),
        "plan": "free",
        "monthly_usage": 0,
        "bonus_usage": 0,
        "created_at": datetime.utcnow()
    })
    user_id = str(result.inserted_id)
    users_col.update_one({"_id": result.inserted_id}, {"$set": {"referral_code": user_id[:8]}})
    return {"token": create_token(user_id, "free"), "plan": "free", "email": req.email}

@app.post("/login")
def login(req: LoginRequest):
    user = users_col.find_one({"email": req.email})
    if not user or not pwd_context.verify(req.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {
        "token": create_token(str(user["_id"]), user["plan"]),
        "plan": user["plan"], "email": user["email"],
        "usage": user.get("monthly_usage", 0),
        "limit": PLAN_LIMITS.get(user["plan"], 5)
    }

@app.get("/me")
def get_me(user=Depends(get_current_user)):
    return {
        "email": user["email"], "plan": user["plan"],
        "usage": user.get("monthly_usage", 0),
        "limit": PLAN_LIMITS.get(user["plan"], 5),
        "referral_code": user.get("referral_code", "")
    }

@app.get("/")
def home():
    return {"message": "AI Marketing Backend Running"}

@app.get("/history")
def get_history(user=Depends(get_current_user)):
    try:
        items = list(collection.find({"user_id": str(user["_id"])}, {"_id": 0}).sort("_id", -1).limit(10))
        return {"history": items}
    except Exception as e:
        return {"error": str(e)}

# =========================
# ADMIN DASHBOARD
# =========================

@app.get("/admin/stats")
def admin_stats(user=Depends(require_admin)):
    total_users = users_col.count_documents({})
    free_users = users_col.count_documents({"plan": "free"})
    pro_users = users_col.count_documents({"plan": "pro"})
    premium_users = users_col.count_documents({"plan": "premium"})
    total_generations = collection.count_documents({})
    recent_users = list(users_col.find({}, {"_id": 0, "email": 1, "plan": 1, "monthly_usage": 1, "created_at": 1}).sort("created_at", -1).limit(10))
    recent_generations = list(collection.find({}, {"_id": 0, "type": 1, "created_at": 1}).sort("created_at", -1).limit(20))
    return {
        "total_users": total_users, "free_users": free_users,
        "pro_users": pro_users, "premium_users": premium_users,
        "total_generations": total_generations,
        "mrr": (pro_users * 29) + (premium_users * 99),
        "recent_users": recent_users, "recent_generations": recent_generations
    }

# =========================
# MARKETING GENERATOR
# =========================

@app.post("/generate")
def generate_content(request: ListingRequest, user=Depends(get_current_user)):
    check_and_increment_usage(user)
    prompt = f"You are a marketing expert. Business: {request.business_type}, Audience: {request.audience}, Details: {request.details}, Tone: {request.tone}. Create: 1) Instagram caption with emoji 2) 10 hashtags 3) Facebook ad 4) Call to action. Make it modern and conversion-focused."
    response = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role": "user", "content": prompt}])
    output = response.choices[0].message.content
    collection.insert_one({"user_id": str(user["_id"]), "type": "marketing_content", "business_type": request.business_type, "audience": request.audience, "details": request.details, "tone": request.tone, "result": output, "created_at": datetime.utcnow()})
    return {"result": output}

# =========================
# LEAD REPLY GENERATOR
# =========================

@app.post("/lead-reply")
def generate_lead_reply(request: LeadReplyRequest, user=Depends(get_current_user)):
    check_and_increment_usage(user)
    prompt = f"You are a top real estate agent. Lead message: {request.lead_message}. Property: {request.property_type}. Tone: {request.tone}. Write ONE short conversational reply ready to send. No placeholders. Ask a follow-up question. Guide toward booking a showing."
    response = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role": "user", "content": prompt}])
    output = response.choices[0].message.content
    collection.insert_one({"user_id": str(user["_id"]), "type": "lead_reply", "lead_message": request.lead_message, "property_type": request.property_type, "tone": request.tone, "result": output, "created_at": datetime.utcnow()})
    return {"result": output}

# =========================
# LISTING DESCRIPTION
# =========================

@app.post("/listing-description")
def generate_listing(request: ListingDescRequest, user=Depends(get_current_user)):
    check_and_increment_usage(user)
    prompt = f"You are an expert real estate copywriter. Property: {request.address} | {request.bedrooms}bd {request.bathrooms}ba | {request.sqft} sqft | {request.price}. Features: {request.features}. Tone: {request.tone}. Write MLS VERSION (150 words, punchy, CTA) and MARKETING VERSION (300 words, emotional, Zillow-ready). Use 'MLS VERSION:' and 'MARKETING VERSION:' headers."
    response = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role": "user", "content": prompt}])
    output = response.choices[0].message.content
    collection.insert_one({"user_id": str(user["_id"]), "type": "listing_description", "address": request.address, "price": request.price, "features": request.features, "result": output, "created_at": datetime.utcnow()})
    return {"result": output}

# =========================
# AFFORDABILITY CALCULATOR
# =========================

@app.post("/affordability")
def calculate_affordability(request: AffordabilityRequest, user=Depends(get_current_user)):
    loan_amount = request.home_price - request.down_payment
    monthly_rate = (request.interest_rate / 100) / 12
    n = request.loan_term * 12
    monthly_pi = loan_amount * (monthly_rate * (1 + monthly_rate)**n) / ((1 + monthly_rate)**n - 1) if monthly_rate > 0 else loan_amount / n
    est_tax_insurance = (request.home_price * 0.0125) / 12
    total_monthly = monthly_pi + est_tax_insurance
    dti = ((total_monthly + request.monthly_debts) / (request.annual_income / 12)) * 100
    max_home_price = ((request.annual_income / 12) * 0.28 - est_tax_insurance) / (monthly_rate * (1 + monthly_rate)**n / ((1 + monthly_rate)**n - 1)) + request.down_payment if monthly_rate > 0 else 0
    status = "strong" if dti < 28 else "acceptable" if dti < 36 else "tight" if dti < 43 else "over limit"
    return {"loan_amount": round(loan_amount, 2), "monthly_payment": round(monthly_pi, 2), "est_tax_insurance": round(est_tax_insurance, 2), "total_monthly": round(total_monthly, 2), "dti_ratio": round(dti, 1), "dti_status": status, "max_recommended_price": round(max_home_price, 2), "down_payment_pct": round((request.down_payment / request.home_price) * 100, 1)}

# =========================
# MARKET SNAPSHOT
# =========================

@app.post("/market-snapshot")
def market_snapshot(request: MarketSnapshotRequest, user=Depends(get_current_user)):
    list_to_sale_ratio = (request.avg_sale_price / request.avg_list_price) * 100
    absorption_rate = (request.sold_last_30_days / request.total_listings) * 100 if request.total_listings > 0 else 0
    if request.months_of_inventory < 3:
        market_type, market_color = "Strong Seller's Market", "red"
    elif request.months_of_inventory < 5:
        market_type, market_color = "Seller's Market", "orange"
    elif request.months_of_inventory < 7:
        market_type, market_color = "Balanced Market", "green"
    else:
        market_type, market_color = "Buyer's Market", "blue"
    prompt = f"Real estate market analyst. Write 3-sentence summary for ZIP {request.zip_code}: Avg List ${request.avg_list_price:,.0f}, Avg Sale ${request.avg_sale_price:,.0f}, {request.avg_days_on_market} DOM, {request.months_of_inventory} months inventory, {market_type}. Direct, useful, no fluff."
    response = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role": "user", "content": prompt}], max_tokens=150)
    summary = response.choices[0].message.content
    collection.insert_one({"user_id": str(user["_id"]), "type": "market_snapshot", "zip_code": request.zip_code, "result": summary, "created_at": datetime.utcnow()})
    return {"zip_code": request.zip_code, "market_type": market_type, "market_color": market_color, "list_to_sale_ratio": round(list_to_sale_ratio, 1), "absorption_rate": round(absorption_rate, 1), "summary": summary, "data": {"avg_list_price": request.avg_list_price, "avg_sale_price": request.avg_sale_price, "avg_days_on_market": request.avg_days_on_market, "avg_price_per_sqft": request.avg_price_per_sqft, "months_of_inventory": request.months_of_inventory, "total_listings": request.total_listings, "sold_last_30_days": request.sold_last_30_days}}

# =========================
# LEAD SCORER
# =========================

@app.post("/lead-score")
def score_lead(request: LeadScorerRequest, user=Depends(get_current_user)):
    check_and_increment_usage(user)
    prompt = f"Real estate lead specialist. Lead: {request.lead_name} | Source: {request.source} | Timeframe: {request.timeframe} | Pre-approved: {request.pre_approved} | Has agent: {request.has_agent} | Message: {request.lead_message}\n\nRespond EXACTLY:\nSCORE: [1-10]\nTEMPERATURE: [Cold/Warm/Hot]\nPRIORITY: [Low/Medium/High/Urgent]\nSUMMARY: [one sentence]\nNEXT_ACTION: [specific step]\nFOLLOW_UP: [ready-to-send message]\nWATCH_OUT: [one red flag]"
    response = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role": "user", "content": prompt}], max_tokens=400)
    output = response.choices[0].message.content
    parsed = {}
    for line in output.strip().split('\n'):
        if ':' in line:
            key, _, value = line.partition(':')
            parsed[key.strip()] = value.strip()
    score = int(parsed.get("SCORE", "5"))
    collection.insert_one({"user_id": str(user["_id"]), "type": "lead_score", "lead_name": request.lead_name, "score": score, "result": output, "created_at": datetime.utcnow()})
    return {"score": score, "temperature": parsed.get("TEMPERATURE", "Warm"), "priority": parsed.get("PRIORITY", "Medium"), "summary": parsed.get("SUMMARY", ""), "next_action": parsed.get("NEXT_ACTION", ""), "follow_up": parsed.get("FOLLOW_UP", ""), "watch_out": parsed.get("WATCH_OUT", "")}

# =========================
# OBJECTION HANDLER
# =========================

@app.post("/objection-handler")
def handle_objection(request: ObjectionRequest, user=Depends(get_current_user)):
    check_and_increment_usage(user)
    prompt = f"Top real estate coach. {request.objection_type} objection: '{request.objection}'. Context: {request.context or 'Standard'}.\n\nProvide:\n1. ACKNOWLEDGE: Validate without agreeing\n2. REFRAME: Turn into reason to move forward\n3. RESPONSE: Natural 3-4 sentence reply to say out loud\n4. BACKUP: What to say if they push back\n\nSound like trusted advisor not salesperson."
    response = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role": "user", "content": prompt}], max_tokens=400)
    output = response.choices[0].message.content
    collection.insert_one({"user_id": str(user["_id"]), "type": "objection_handler", "objection": request.objection, "result": output, "created_at": datetime.utcnow()})
    return {"result": output}

# =========================
# DRIP EMAIL WRITER
# =========================

@app.post("/drip-emails")
def generate_drip_emails(request: DripEmailRequest, user=Depends(get_current_user)):
    check_and_increment_usage(user)
    prompt = f"Real estate email copywriter. Lead: {request.lead_name} | Type: {request.lead_type} | Interest: {request.property_interest} | Agent: {request.agent_name} | Tone: {request.tone}.\n\nWrite 3-email drip sequence. Each: compelling subject, under 150 words, personal not automated, one CTA.\n\nEMAIL 1 - Day 1:\nSubject: [subject]\nBody: [body]\n\nEMAIL 2 - Day 4:\nSubject: [subject]\nBody: [body]\n\nEMAIL 3 - Day 10:\nSubject: [subject]\nBody: [body]"
    response = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role": "user", "content": prompt}], max_tokens=600)
    output = response.choices[0].message.content
    collection.insert_one({"user_id": str(user["_id"]), "type": "drip_emails", "lead_name": request.lead_name, "result": output, "created_at": datetime.utcnow()})
    return {"result": output}

# =========================
# SELLER NET SHEET
# =========================

@app.post("/seller-net-sheet")
def seller_net_sheet(request: SellerNetSheetRequest, user=Depends(get_current_user)):
    commission_amount = request.sale_price * (request.agent_commission / 100)
    closing_cost_amount = request.sale_price * (request.closing_costs / 100)
    total_deductions = commission_amount + closing_cost_amount + request.mortgage_balance + request.repairs + request.other_fees
    net_proceeds = request.sale_price - total_deductions
    return {"sale_price": round(request.sale_price, 2), "commission_amount": round(commission_amount, 2), "closing_cost_amount": round(closing_cost_amount, 2), "mortgage_balance": round(request.mortgage_balance, 2), "repairs": round(request.repairs, 2), "other_fees": round(request.other_fees, 2), "total_deductions": round(total_deductions, 2), "net_proceeds": round(net_proceeds, 2), "net_pct": round((net_proceeds / request.sale_price) * 100, 1)}

# =========================
# PRICE DROP ALERT
# =========================

@app.post("/price-drop-alert")
def price_drop_alert(request: PriceDropRequest, user=Depends(get_current_user)):
    check_and_increment_usage(user)
    orig = float(request.original_price.replace("$", "").replace(",", ""))
    new = float(request.new_price.replace("$", "").replace(",", ""))
    drop_amount = orig - new
    drop_pct = round((drop_amount / orig) * 100, 1)
    prompt = f"Real estate marketing expert. Property: {request.address} | {request.bedrooms}bd {request.bathrooms}ba | {request.sqft} sqft. Price reduced from {request.original_price} to {request.new_price} (${drop_amount:,.0f} / {drop_pct}% drop). Features: {request.key_features}. Tone: {request.tone}.\n\nWrite:\nINSTAGRAM POST: Scroll-stopping, emojis, urgency.\nFACEBOOK POST: Slightly longer, price improvement angle.\nEMAIL SUBJECT + BODY: Subject line + short email for buyer list."
    response = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role": "user", "content": prompt}], max_tokens=500)
    output = response.choices[0].message.content
    collection.insert_one({"user_id": str(user["_id"]), "type": "price_drop_alert", "address": request.address, "result": output, "created_at": datetime.utcnow()})
    return {"result": output, "drop_amount": round(drop_amount, 2), "drop_pct": drop_pct}

# =========================
# NEIGHBORHOOD BIO
# =========================

@app.post("/neighborhood-bio")
def neighborhood_bio(request: NeighborhoodBioRequest, user=Depends(get_current_user)):
    check_and_increment_usage(user)
    prompt = f"Real estate copywriter specializing in neighborhoods. Neighborhood: {request.neighborhood}, {request.city}, {request.state}. Highlights: {request.highlights}. Target buyer: {request.target_buyer}.\n\nWrite:\nSHORT BIO (100 words): For MLS or listing sites.\nLONG BIO (250 words): For agent websites, Zillow, marketing. Include lifestyle, community feel.\nUse 'SHORT BIO:' and 'LONG BIO:' headers."
    response = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role": "user", "content": prompt}], max_tokens=500)
    output = response.choices[0].message.content
    collection.insert_one({"user_id": str(user["_id"]), "type": "neighborhood_bio", "neighborhood": request.neighborhood, "result": output, "created_at": datetime.utcnow()})
    return {"result": output}

# =========================
# REFERRAL SYSTEM
# =========================

@app.post("/referral/apply")
def apply_referral(request: ReferralRequest, user=Depends(get_current_user)):
    referrer = users_col.find_one({"email": request.referrer_email})
    if not referrer:
        raise HTTPException(status_code=404, detail="Referral email not found")
    if str(referrer["_id"]) == str(user["_id"]):
        raise HTTPException(status_code=400, detail="Cannot refer yourself")
    if users_col.find_one({"_id": user["_id"], "referred_by": {"$exists": True}}):
        raise HTTPException(status_code=400, detail="Referral already applied")
    users_col.update_one({"_id": referrer["_id"]}, {"$inc": {"monthly_usage": -10}})
    users_col.update_one({"_id": user["_id"]}, {"$set": {"referred_by": str(referrer["_id"])}, "$inc": {"monthly_usage": -5}})
    return {"message": "Referral applied! Your friend got 10 bonus generations, you got 5."}

@app.get("/referral/stats")
def referral_stats(user=Depends(get_current_user)):
    referral_count = users_col.count_documents({"referred_by": str(user["_id"])})
    code = user.get("referral_code", str(user["_id"])[:8])
    return {"referral_code": code, "referral_link": f"https://ai-realtor-tools.vercel.app?ref={code}", "total_referrals": referral_count, "bonus_generations_earned": referral_count * 10}

# =========================
# STRIPE PAYMENTS
# =========================

@app.post("/create-checkout")
def create_checkout(request: CheckoutRequest, user=Depends(get_current_user)):
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"], mode="subscription",
            customer_email=user["email"],
            line_items=[{"price": STRIPE_PRICES[request.plan], "quantity": 1}],
            success_url="https://ai-realtor-tools.vercel.app?upgraded=true",
            cancel_url="https://ai-realtor-tools.vercel.app",
            metadata={"user_id": str(user["_id"]), "plan": request.plan}
        )
        return {"url": session.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret) if webhook_secret else stripe.Event.construct_from(json.loads(payload), stripe.api_key)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        plan = session.get("metadata", {}).get("plan")
        if user_id and plan:
            users_col.update_one({"_id": ObjectId(user_id)}, {"$set": {"plan": plan, "monthly_usage": 0, "stripe_customer_id": session.get("customer")}})
    return {"status": "ok"}

@app.get("/publishable-key")
def get_publishable_key(user=Depends(get_current_user)):
    return {"key": os.getenv("STRIPE_PUBLISHABLE_KEY")}

# =========================
# PASSWORD RESET
# =========================

@app.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest):
    user = users_col.find_one({"email": request.email})
    if not user:
        return {"message": "If that email exists, a reset link was sent."}
    reset_token = str(ObjectId())
    users_col.update_one({"_id": user["_id"]}, {"$set": {"reset_token": reset_token, "reset_token_exp": datetime.utcnow() + timedelta(hours=1)}})
    return {"message": "If that email exists, a reset link was sent.", "reset_link": f"https://ai-realtor-tools.vercel.app?reset={reset_token}"}

@app.post("/reset-password")
def reset_password(request: ResetPasswordRequest):
    user = users_col.find_one({"reset_token": request.token, "reset_token_exp": {"$gt": datetime.utcnow()}})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    users_col.update_one({"_id": user["_id"]}, {"$set": {"hashed_password": pwd_context.hash(request.new_password)}, "$unset": {"reset_token": "", "reset_token_exp": ""}})
    return {"message": "Password reset successfully!"}

# =========================
# TEAM / BROKERAGE PLANS
# =========================

@app.post("/team/invite")
def invite_team_member(request: TeamInviteRequest, user=Depends(get_current_user)):
    if user.get("plan") not in ["team_starter", "team_pro"]:
        raise HTTPException(status_code=403, detail="Team plans only. Upgrade to Team Starter or Team Pro.")
    max_seats = 5 if user.get("plan") == "team_starter" else 15
    current_members = db["teams"].count_documents({"owner_id": str(user["_id"])})
    if current_members >= max_seats:
        raise HTTPException(status_code=400, detail=f"Seat limit reached ({max_seats} seats max)")
    if users_col.find_one({"email": request.email, "team_owner_id": str(user["_id"])}):
        raise HTTPException(status_code=400, detail="Already a team member")
    invite_code = str(user["_id"])[:8] + "-" + request.email[:4]
    db["team_invites"].insert_one({
        "owner_id": str(user["_id"]),
        "owner_email": user["email"],
        "invitee_email": request.email,
        "invite_code": invite_code,
        "plan": user.get("plan"),
        "created_at": datetime.utcnow()
    })
    return {"message": f"Invite sent to {request.email}", "invite_code": invite_code, "invite_link": f"https://ai-realtor-tools.vercel.app?invite={invite_code}"}

@app.post("/team/accept")
def accept_team_invite(request: TeamAcceptRequest, user=Depends(get_current_user)):
    invite = db["team_invites"].find_one({"invite_code": request.invite_code, "invitee_email": user["email"]})
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite code or email mismatch")
    users_col.update_one({"_id": user["_id"]}, {"$set": {"team_owner_id": invite["owner_id"], "plan": invite["plan"]}})
    db["team_invites"].delete_one({"invite_code": request.invite_code})
    return {"message": "You joined the team successfully!"}

@app.get("/team/members")
def get_team_members(user=Depends(get_current_user)):
    if user.get("plan") not in ["team_starter", "team_pro"]:
        raise HTTPException(status_code=403, detail="Team plans only")
    members = list(users_col.find({"team_owner_id": str(user["_id"])}, {"_id": 0, "email": 1, "monthly_usage": 1, "created_at": 1}))
    max_seats = 5 if user.get("plan") == "team_starter" else 15
    pending = list(db["team_invites"].find({"owner_id": str(user["_id"])}, {"_id": 0, "invitee_email": 1, "invite_code": 1}))
    return {"members": members, "pending_invites": pending, "seats_used": len(members), "seats_total": max_seats}

# =========================
# CHAT WIDGET
# =========================

class ChatSetupRequest(BaseModel):
    agent_name: str
    agent_email: str
    areas_served: str
    specialties: str = ""
    tone: str = "professional"

class ChatMessageRequest(BaseModel):
    session_id: str
    message: str
    agent_id: str

if user.get("plan") not in ["premium", "team_starter", "team_pro"]:
        raise HTTPException(status_code=403, detail="Chat widget is available on Premium and Team plans only.")
    agent_id = str(user["_id"])
    db["chat_agents"].update_one(
        {"agent_id": agent_id},
        {"$set": {
            "agent_id": agent_id,
            "agent_name": request.agent_name,
            "agent_email": request.agent_email,
            "areas_served": request.areas_served,
            "specialties": request.specialties,
            "tone": request.tone,
            "updated_at": datetime.utcnow()
        }},
        upsert=True
    )
    return {"agent_id": agent_id, "widget_code": f'<script src="https://ai-realtor-tools-production.up.railway.app/widget.js?agent={agent_id}"></script>'}
    
@app.get("/chat/setup")
def get_chat_setup(user=Depends(get_current_user)):
    agent_id = str(user["_id"])
    setup = db["chat_agents"].find_one({"agent_id": agent_id}, {"_id": 0})
    return setup or {}

@app.post("/chat/message")
async def chat_message(request: ChatMessageRequest):
    agent = db["chat_agents"].find_one({"agent_id": request.agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    history = list(db["chat_sessions"].find(
        {"session_id": request.session_id},
        {"_id": 0, "role": 1, "content": 1}
    ).sort("created_at", 1).limit(10))
    messages = [
        {"role": "system", "content": f"You are {agent['agent_name']}, a real estate agent serving {agent['areas_served']}. Specialties: {agent.get('specialties', 'general real estate')}. Tone: {agent.get('tone', 'professional')}. Answer client questions helpfully and guide them toward booking a consultation. Keep responses concise and conversational. Never make up specific property details."}
    ]
    for h in history:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": request.message})
    response = client.chat.completions.create(model="gpt-4o-mini", messages=messages, max_tokens=200)
    reply = response.choices[0].message.content
    db["chat_sessions"].insert_many([
        {"session_id": request.session_id, "agent_id": request.agent_id, "role": "user", "content": request.message, "created_at": datetime.utcnow()},
        {"session_id": request.session_id, "agent_id": request.agent_id, "role": "assistant", "content": reply, "created_at": datetime.utcnow()}
    ])
    return {"reply": reply}

@app.get("/chat/sessions")
def get_chat_sessions(user=Depends(get_current_user)):
    agent_id = str(user["_id"])
    sessions = list(db["chat_sessions"].aggregate([
        {"$match": {"agent_id": agent_id}},
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$session_id", "last_message": {"$first": "$content"}, "last_time": {"$first": "$created_at"}, "count": {"$sum": 1}}},
        {"$limit": 20}
    ]))
    for s in sessions:
        s["session_id"] = s.pop("_id")
        s["last_time"] = str(s["last_time"])
    return {"sessions": sessions}

@app.get("/widget.js")
async def serve_widget(agent: str):
    js = f"""
(function() {{
  var agentId = '{agent}';
  var apiUrl = 'https://ai-realtor-tools-production.up.railway.app';
  var sessionId = 'sess_' + Math.random().toString(36).substr(2, 9);

  var style = document.createElement('style');
  style.textContent = `
    #rt-chat-btn {{ position:fixed; bottom:24px; right:24px; width:56px; height:56px; border-radius:50%; background:linear-gradient(135deg,#3b82f6,#6366f1); border:none; cursor:pointer; z-index:9999; font-size:24px; box-shadow:0 4px 20px rgba(59,130,246,0.5); }}
    #rt-chat-box {{ position:fixed; bottom:90px; right:24px; width:340px; height:480px; background:#0d1117; border:1px solid #1e2a3a; border-radius:16px; z-index:9999; display:none; flex-direction:column; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.5); font-family:'DM Sans',system-ui,sans-serif; }}
    #rt-chat-header {{ background:#161b27; padding:16px; border-bottom:1px solid #1e2a3a; color:#fff; font-weight:700; font-size:14px; }}
    #rt-chat-msgs {{ flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:10px; }}
    .rt-msg {{ max-width:80%; padding:10px 14px; border-radius:12px; font-size:13px; line-height:1.5; }}
    .rt-msg.user {{ background:#3b82f6; color:#fff; align-self:flex-end; border-bottom-right-radius:4px; }}
    .rt-msg.bot {{ background:#1e2a3a; color:#cdd6f4; align-self:flex-start; border-bottom-left-radius:4px; }}
    #rt-chat-input {{ display:flex; padding:12px; border-top:1px solid #1e2a3a; gap:8px; }}
    #rt-chat-input input {{ flex:1; background:#080c14; border:1px solid #1e2a3a; border-radius:8px; padding:10px 12px; color:#fff; font-size:13px; outline:none; font-family:inherit; }}
    #rt-chat-input button {{ background:linear-gradient(135deg,#3b82f6,#6366f1); border:none; border-radius:8px; padding:10px 14px; color:#fff; cursor:pointer; font-weight:700; font-size:13px; }}
  `;
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.id = 'rt-chat-btn';
  btn.innerHTML = '💬';
  document.body.appendChild(btn);

  var box = document.createElement('div');
  box.id = 'rt-chat-box';
  box.innerHTML = `
    <div id="rt-chat-header">🏡 Chat with us!</div>
    <div id="rt-chat-msgs">
      <div class="rt-msg bot">Hi! I'm here to help with any real estate questions. What can I help you with today?</div>
    </div>
    <div id="rt-chat-input">
      <input type="text" placeholder="Type a message..." id="rt-input" />
      <button id="rt-send">Send</button>
    </div>
  `;
  document.body.appendChild(box);

  btn.onclick = function() {{
    box.style.display = box.style.display === 'flex' ? 'none' : 'flex';
  }};

  async function sendMessage() {{
    var input = document.getElementById('rt-input');
    var msgs = document.getElementById('rt-chat-msgs');
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    var userMsg = document.createElement('div');
    userMsg.className = 'rt-msg user';
    userMsg.textContent = text;
    msgs.appendChild(userMsg);
    msgs.scrollTop = msgs.scrollHeight;
    var typing = document.createElement('div');
    typing.className = 'rt-msg bot';
    typing.textContent = '...';
    msgs.appendChild(typing);
    try {{
      var res = await fetch(apiUrl + '/chat/message', {{
        method: 'POST',
        headers: {{'Content-Type': 'application/json'}},
        body: JSON.stringify({{session_id: sessionId, message: text, agent_id: agentId}})
      }});
      var data = await res.json();
      typing.textContent = data.reply;
    }} catch(e) {{
      typing.textContent = 'Sorry, something went wrong. Please try again.';
    }}
    msgs.scrollTop = msgs.scrollHeight;
  }}

  document.getElementById('rt-send').onclick = sendMessage;
  document.getElementById('rt-input').onkeydown = function(e) {{
    if (e.key === 'Enter') sendMessage();
  }};
}})();
"""
    from fastapi.responses import Response
    return Response(content=js, media_type="application/javascript")

# =========================
# CENSUS NEIGHBORHOOD DATA
# =========================

@app.post("/neighborhood-demographics")
async def neighborhood_demographics(request: CensusRequest, user=Depends(get_current_user)):
    check_and_increment_usage(user)
    census_key = os.getenv("CENSUS_API_KEY")
    try:
        async with httpx.AsyncClient(timeout=30.0) as http:
            url = f"https://api.census.gov/data/2022/acs/acs5?get=NAME,B19013_001E,B25077_001E,B01003_001E,B25003_002E,B25003_003E,B01002_001E&for=zip%20code%20tabulation%20area:{request.zip_code}&key={census_key}"
            response = await http.get(url)
            raw = response.text
            if not raw or raw.strip() == "":
                raise HTTPException(status_code=400, detail="Census API returned empty response")
            data = response.json()
            if len(data) < 2:
                raise HTTPException(status_code=404, detail="ZIP code not found")
            headers = data[0]
            values = data[1]
            row = dict(zip(headers, values))
            median_income = int(row.get("B19013_001E", 0) or 0)
            median_home_value = int(row.get("B25077_001E", 0) or 0)
            population = int(row.get("B01003_001E", 0) or 0)
            owner_occupied = int(row.get("B25003_002E", 0) or 0)
            renter_occupied = int(row.get("B25003_003E", 0) or 0)
            median_age = float(row.get("B01002_001E", 0) or 0)
            total_occupied = owner_occupied + renter_occupied
            owner_pct = round((owner_occupied / total_occupied * 100), 1) if total_occupied > 0 else 0
            renter_pct = round((renter_occupied / total_occupied * 100), 1) if total_occupied > 0 else 0
            prompt = f"Real estate analyst. Write 3-sentence neighborhood summary for ZIP {request.zip_code}: Median Income ${median_income:,}, Median Home Value ${median_home_value:,}, Population {population:,}, Owner Occupied {owner_pct}%, Median Age {median_age}. Be direct and useful for a real estate agent."
            ai_response = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role": "user", "content": prompt}], max_tokens=150)
            summary = ai_response.choices[0].message.content
            collection.insert_one({"user_id": str(user["_id"]), "type": "neighborhood_demographics", "zip_code": request.zip_code, "result": summary, "created_at": datetime.utcnow()})
            return {"zip_code": request.zip_code, "name": row.get("NAME", ""), "median_income": median_income, "median_home_value": median_home_value, "population": population, "owner_pct": owner_pct, "renter_pct": renter_pct, "median_age": median_age, "summary": summary}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Census API error: {str(e)}")
