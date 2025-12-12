from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth_router, products_router, users_router, comments_router, analytics_router, payments_router, orders_router
from app.routes.logs import router as logs_router
from app.database import engine, Base, SessionLocal
from app.db_models import User, UserRole, UserStatus
from app.auth import get_password_hash

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize default users
def initialize_default_users():
    """Create default admin and user accounts if they don't exist"""
    db = SessionLocal()
    try:
        # Create admin user if not exists
        admin_exists = db.query(User).filter(User.email == "admin@admin.com").first()
        if not admin_exists:
            admin_user = User(
                username="admin",
                email="admin@admin.com",
                password_hash=get_password_hash("admin"),
                role=UserRole.ADMIN,
                status=UserStatus.ACTIVE
            )
            db.add(admin_user)
            db.commit()
            print("✓ Admin user created (admin@admin.com / admin)")

        # Create regular user if not exists
        user_exists = db.query(User).filter(User.email == "user@user.com").first()
        if not user_exists:
            regular_user = User(
                username="user",
                email="user@user.com",
                password_hash=get_password_hash("user"),
                role=UserRole.USER,
                status=UserStatus.ACTIVE
            )
            db.add(regular_user)
            db.commit()
            print("✓ Regular user created (user@user.com / user)")

    except Exception as e:
        print(f"Error initializing default users: {e}")
        db.rollback()
    finally:
        db.close()

# Initialize default users on startup
initialize_default_users()

app = FastAPI(
    title="Aviroze E-Commerce API",
    description="Backend API for Aviroze premium fashion e-commerce",
    version="1.0.0"
)

# Configure CORS - Allow all localhost ports for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(products_router)
app.include_router(users_router)
app.include_router(comments_router)
app.include_router(analytics_router)
app.include_router(payments_router)
app.include_router(orders_router)
app.include_router(logs_router)

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
