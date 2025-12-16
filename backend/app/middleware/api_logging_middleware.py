from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.db_models import APIRequestLog, User
import time
import jwt
import os

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"

class APILoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log all API requests (separate from user activity tracking).
    Tracks API performance, errors, and usage patterns.
    """

    async def dispatch(self, request: Request, call_next):
        # Only log API endpoints
        if not request.url.path.startswith('/api/'):
            return await call_next(request)

        # Skip logging for the logs endpoints themselves to avoid recursion
        if request.url.path.startswith('/api/logs/'):
            return await call_next(request)

        # Get start time
        start_time = time.time()

        # Try to get user from token
        user_id = None
        token = request.headers.get("Authorization")
        if token and token.startswith("Bearer "):
            try:
                token = token.replace("Bearer ", "")
                # Decode JWT token
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                if payload:
                    # Get user_id from database
                    db = SessionLocal()
                    try:
                        user = db.query(User).filter(User.email == payload.get("sub")).first()
                        if user:
                            user_id = user.id
                    finally:
                        db.close()
            except:
                pass

        # Process the request
        response = await call_next(request)

        # Calculate response time
        response_time = time.time() - start_time

        # Get request metadata
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", None)

        # Parse query parameters
        query_params = dict(request.query_params) if request.query_params else None

        # Log the API request
        db = SessionLocal()
        try:
            log = APIRequestLog(
                user_id=user_id,
                method=request.method,
                path=request.url.path,
                endpoint=f"{request.method} {request.url.path}",
                status_code=response.status_code,
                response_time=response_time,
                ip_address=ip_address,
                user_agent=user_agent,
                query_params=query_params
            )
            db.add(log)
            db.commit()
        except Exception as e:
            print(f"Failed to log API request: {e}")
            db.rollback()
        finally:
            db.close()

        # Add response time header
        response.headers["X-Process-Time"] = str(response_time)

        return response
