from fastapi import FastAPI, HTTPException, Depends
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
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# MongoDB
mongo_client = MongoClient(os.getenv("MONGO_URI"))
db = mongo_client[os.getenv("DB_NAME")]
collection = db["generations"]
users_col = db["users"]

# JWT Secret — add JWT_SECRET to your .env file!
JWT_SECRET = os.getenv("JWT_SECRET", "change-this-secret")

# =========================
# PLAN LIMITS
# =========================

PLAN_LIMITS = {
    "free": 5,
    "pro": 200,
    "premium": 999999
}

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

# =========================
# AUTH HELPERS
# =========================

def create_token(user_id: str, plan: str):
    payload = {
        "sub": user_id,
        "plan": plan,
        "exp": datetime.utcnow() + timedelta(days=30)
    }
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

def check_and_increment_usage(user):
    """Check if user is under their plan limit, then increment."""
    plan = user.get("plan", "free")
    limit = PLAN_LIMITS.get(plan, 5)
    current_usage = user.get("monthly_usage", 0)

    if current_usage >= limit:
        raise HTTPException(
            status_code=402,
            detail=f"Monthly limit of {limit} reached. Upgrade your plan to continue."
        )

    users_col.update_one(
        {"_id": user["_id"]},
        {"$inc": {"monthly_usage": 1}}
    )

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
        "created_at": datetime.utcnow()
    })

    token = create_token(str(result.inserted_id), "free")
    return {"token": token, "plan": "free", "email": req.email}

@app.post("/login")
def login(req: LoginRequest):
    user = users_col.find_one({"email": req.email})
    if not user or not pwd_context.verify(req.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(str(user["_id"]), user["plan"])
    return {
        "token": token,
        "plan": user["plan"],
        "email": user["email"],
        "usage": user.get("monthly_usage", 0),
        "limit": PLAN_LIMITS.get(user["plan"], 5)
    }

@app.get("/me")
def get_me(user=Depends(get_current_user)):
    """Returns current user info — call this on app load to check login state."""
    return {
        "email": user["email"],
        "plan": user["plan"],
        "usage": user.get("monthly_usage", 0),
        "limit": PLAN_LIMITS.get(user["plan"], 5)
    }

# =========================
# CORE ROUTES
# =========================

@app.get("/")
def home():
    return {"message": "AI Marketing Backend Running"}

@app.get("/history")
def get_history(user=Depends(get_current_user)):
    """Now returns only THIS user's history."""
    try:
        items = list(
            collection.find(
                {"user_id": str(user["_id"])}, {"_id": 0}
            ).sort("_id", -1).limit(10)
        )
        return {"history": items}
    except Exception as e:
        return {"error": str(e)}

# =========================
# MARKETING GENERATOR
# =========================

@app.post("/generate")
def generate_content(request: ListingRequest, user=Depends(get_current_user)):
    check_and_increment_usage(user)  # 🔒 gated

    prompt = f"""
You are a marketing expert for small businesses.

Business Type: {request.business_type}
Target Audience: {request.audience}
Details: {request.details}
Tone: {request.tone}

Create high-converting content:

1. Instagram caption (engaging + emoji)
2. 10 relevant hashtags
3. Facebook ad (persuasive)
4. Strong call to action

Make it modern, scroll-stopping, and conversion-focused.
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    output = response.choices[0].message.content

    collection.insert_one({
        "user_id": str(user["_id"]),          # ← ties history to user
        "type": "marketing_content",
        "business_type": request.business_type,
        "audience": request.audience,
        "details": request.details,
        "tone": request.tone,
        "result": output,
        "created_at": datetime.utcnow()
    })

    return {"result": output}

# =========================
# LEAD REPLY GENERATOR
# =========================

@app.post("/lead-reply")
def generate_lead_reply(request: LeadReplyRequest, user=Depends(get_current_user)):
    check_and_increment_usage(user)  # 🔒 gated

    prompt = f"""
You are a high-performing real estate agent focused on converting leads into appointments.

Lead Message:
{request.lead_message}

Property Type:
{request.property_type}

Tone:
{request.tone}

Your goals:
- Respond naturally (not robotic)
- Build trust quickly
- Sound like a real human agent
- Ask a smart follow-up question
- Guide the lead toward booking a showing

Rules:
- Keep it short and conversational
- No placeholders like [Your Name]
- No formatting like "1., 2., 3."
- Write as ONE clean message ready to send

Make it feel like a top realtor texting or emailing a lead.
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    output = response.choices[0].message.content

    collection.insert_one({
        "user_id": str(user["_id"]),          # ← ties history to user
        "type": "lead_reply",
        "lead_message": request.lead_message,
        "property_type": request.property_type,
        "tone": request.tone,
        "result": output,
        "created_at": datetime.utcnow()
    })

    return {"result": output}
    # =========================
# LISTING DESCRIPTION GENERATOR
# =========================

class ListingDescRequest(BaseModel):
    address: str
    bedrooms: int
    bathrooms: float
    sqft: int
    price: str
    features: str
    tone: str = "professional"

@app.post("/listing-description")
def generate_listing(request: ListingDescRequest, user=Depends(get_current_user)):
    check_and_increment_usage(user)

    prompt = f"""
You are an expert real estate copywriter who writes MLS listing descriptions that sell homes fast.

Property Details:
- Address/Area: {request.address}
- Bedrooms: {request.bedrooms} | Bathrooms: {request.bathrooms}
- Square Footage: {request.sqft} sqft
- Asking Price: {request.price}
- Key Features: {request.features}
- Tone: {request.tone}

Write TWO versions:

VERSION 1 - MLS SHORT (150 words max):
A tight, punchy MLS description hitting the best features. End with a call to action.

VERSION 2 - MARKETING LONG (300 words):
A rich, emotional description for Zillow/Realtor.com. Paint a picture of lifestyle.
Lead with the strongest selling point. Use vivid but professional language.
No clichés like "must see" or "won't last long".

Format clearly with "MLS VERSION:" and "MARKETING VERSION:" headers.
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    output = response.choices[0].message.content

    collection.insert_one({
        "user_id": str(user["_id"]),
        "type": "listing_description",
        "address": request.address,
        "price": request.price,
        "features": request.features,
        "result": output,
        "created_at": datetime.utcnow()
    })

    return {"result": output}


# =========================
# AFFORDABILITY CALCULATOR
# =========================

class AffordabilityRequest(BaseModel):
    home_price: float
    down_payment: float
    interest_rate: float
    loan_term: int = 30
    annual_income: float
    monthly_debts: float = 0

@app.post("/affordability")
def calculate_affordability(request: AffordabilityRequest, user=Depends(get_current_user)):
    loan_amount = request.home_price - request.down_payment
    monthly_rate = (request.interest_rate / 100) / 12
    n = request.loan_term * 12

    if monthly_rate > 0:
        monthly_pi = loan_amount * (monthly_rate * (1 + monthly_rate)**n) / ((1 + monthly_rate)**n - 1)
    else:
        monthly_pi = loan_amount / n

    est_tax_insurance = (request.home_price * 0.0125) / 12
    total_monthly = monthly_pi + est_tax_insurance
    dti = ((total_monthly + request.monthly_debts) / (request.annual_income / 12)) * 100

    if monthly_rate > 0:
        max_home_price = ((request.annual_income / 12) * 0.28 - est_tax_insurance) / (monthly_rate * (1 + monthly_rate)**n / ((1 + monthly_rate)**n - 1)) + request.down_payment
    else:
        max_home_price = 0

    status = "strong" if dti < 28 else "acceptable" if dti < 36 else "tight" if dti < 43 else "over limit"

    return {
        "loan_amount": round(loan_amount, 2),
        "monthly_payment": round(monthly_pi, 2),
        "est_tax_insurance": round(est_tax_insurance, 2),
        "total_monthly": round(total_monthly, 2),
        "dti_ratio": round(dti, 1),
        "dti_status": status,
        "max_recommended_price": round(max_home_price, 2),
        "down_payment_pct": round((request.down_payment / request.home_price) * 100, 1)
    }

    # =========================
# MARKET SNAPSHOT
# =========================

class MarketSnapshotRequest(BaseModel):
    zip_code: str
    avg_list_price: float
    avg_sale_price: float
    avg_days_on_market: float
    total_listings: int
    sold_last_30_days: int
    avg_price_per_sqft: float
    months_of_inventory: float

@app.post("/market-snapshot")
def market_snapshot(request: MarketSnapshotRequest, user=Depends(get_current_user)):
    # Pure math — no AI, no usage charge
    list_to_sale_ratio = (request.avg_sale_price / request.avg_list_price) * 100
    absorption_rate = (request.sold_last_30_days / request.total_listings) * 100 if request.total_listings > 0 else 0

    if request.months_of_inventory < 3:
        market_type = "Strong Seller's Market"
        market_color = "red"
    elif request.months_of_inventory < 5:
        market_type = "Seller's Market"
        market_color = "orange"
    elif request.months_of_inventory < 7:
        market_type = "Balanced Market"
        market_color = "green"
    else:
        market_type = "Buyer's Market"
        market_color = "blue"

    # AI market summary
    prompt = f"""
You are a real estate market analyst. Write a SHORT 3-sentence market summary for a realtor to share with clients.

Market Data for ZIP {request.zip_code}:
- Avg List Price: ${request.avg_list_price:,.0f}
- Avg Sale Price: ${request.avg_sale_price:,.0f}
- List-to-Sale Ratio: {list_to_sale_ratio:.1f}%
- Avg Days on Market: {request.avg_days_on_market} days
- Months of Inventory: {request.months_of_inventory}
- Market Type: {market_type}
- Absorption Rate: {absorption_rate:.1f}%

Write 3 sentences max. Be direct and useful. No fluff.
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=150
    )

    summary = response.choices[0].message.content

    collection.insert_one({
        "user_id": str(user["_id"]),
        "type": "market_snapshot",
        "zip_code": request.zip_code,
        "result": summary,
        "created_at": datetime.utcnow()
    })

    return {
        "zip_code": request.zip_code,
        "market_type": market_type,
        "market_color": market_color,
        "list_to_sale_ratio": round(list_to_sale_ratio, 1),
        "absorption_rate": round(absorption_rate, 1),
        "summary": summary,
        "data": {
            "avg_list_price": request.avg_list_price,
            "avg_sale_price": request.avg_sale_price,
            "avg_days_on_market": request.avg_days_on_market,
            "avg_price_per_sqft": request.avg_price_per_sqft,
            "months_of_inventory": request.months_of_inventory,
            "total_listings": request.total_listings,
            "sold_last_30_days": request.sold_last_30_days,
        }
    }
    # =========================
# LEAD SCORER
# =========================

class LeadScorerRequest(BaseModel):
    lead_name: str
    lead_message: str
    source: str
    timeframe: str
    pre_approved: bool = False
    has_agent: bool = False

@app.post("/lead-score")
def score_lead(request: LeadScorerRequest, user=Depends(get_current_user)):
    check_and_increment_usage(user)

    prompt = f"""
You are an expert real estate lead conversion specialist.

Score this lead and provide a strategy.

Lead Details:
- Name: {request.lead_name}
- Message: {request.lead_message}
- Source: {request.source}
- Timeframe: {request.timeframe}
- Pre-approved: {request.pre_approved}
- Already has agent: {request.has_agent}

Respond in this EXACT format:

SCORE: [number 1-10]
TEMPERATURE: [Cold / Warm / Hot]
PRIORITY: [Low / Medium / High / Urgent]
SUMMARY: [One sentence on why this score]
NEXT_ACTION: [Exact first thing to do — be specific]
FOLLOW_UP: [Best follow-up message to send this lead right now — ready to copy/paste]
WATCH_OUT: [One red flag or thing to be careful about]
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=400
    )

    output = response.choices[0].message.content

    lines = output.strip().split('\n')
    parsed = {}
    for line in lines:
        if ':' in line:
            key, _, value = line.partition(':')
            parsed[key.strip()] = value.strip()

    score = int(parsed.get("SCORE", "5"))
    temperature = parsed.get("TEMPERATURE", "Warm")
    priority = parsed.get("PRIORITY", "Medium")
    summary = parsed.get("SUMMARY", "")
    next_action = parsed.get("NEXT_ACTION", "")
    follow_up = parsed.get("FOLLOW_UP", "")
    watch_out = parsed.get("WATCH_OUT", "")

    collection.insert_one({
        "user_id": str(user["_id"]),
        "type": "lead_score",
        "lead_name": request.lead_name,
        "score": score,
        "temperature": temperature,
        "result": output,
        "created_at": datetime.utcnow()
    })

    return {
        "score": score,
        "temperature": temperature,
        "priority": priority,
        "summary": summary,
        "next_action": next_action,
        "follow_up": follow_up,
        "watch_out": watch_out
    }
    # =========================
# STRIPE PAYMENTS
# =========================
import stripe
from fastapi import Request

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

STRIPE_PRICES = {
    "pro": "price_1TKI26Bw1uMt77JZEvFBkQNY",
    "premium": "price_1TKI6KBw1uMt77JZjdREA2Ov"
}

class CheckoutRequest(BaseModel):
    plan: str

@app.post("/create-checkout")
def create_checkout(request: CheckoutRequest, user=Depends(get_current_user)):
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="subscription",
            customer_email=user["email"],
            line_items=[{
                "price": STRIPE_PRICES[request.plan],
                "quantity": 1
            }],
            success_url="http://localhost:5173?upgraded=true",
            cancel_url="http://localhost:5173",
            metadata={
                "user_id": str(user["_id"]),
                "plan": request.plan
            }
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
        if webhook_secret:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        else:
            import json
            event = stripe.Event.construct_from(
                json.loads(payload), stripe.api_key
            )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        plan = session.get("metadata", {}).get("plan")
        if user_id and plan:
            users_col.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {
                    "plan": plan,
                    "monthly_usage": 0,
                    "stripe_customer_id": session.get("customer")
                }}
            )

    return {"status": "ok"}

@app.get("/publishable-key")
def get_publishable_key(user=Depends(get_current_user)):
    return {"key": os.getenv("STRIPE_PUBLISHABLE_KEY")}