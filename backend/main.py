from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth_router, products_router, users_router, comments_router, analytics_router
from app.database import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Aviroze E-Commerce API",
    description="Backend API for Aviroze premium fashion e-commerce",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(products_router)
app.include_router(users_router)
app.include_router(comments_router)
app.include_router(analytics_router)

@app.get("/")
async def root():
    return {
        "message": "Welcome to Aviroze E-Commerce API",
        "version": "1.0.0",
        "status": "active"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
