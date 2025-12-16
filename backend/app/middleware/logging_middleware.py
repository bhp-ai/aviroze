from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.db_models import UserActivityType, User
from app.logging_helper import log_user_activity
import time
import jwt
import os

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"

class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log all requests to the system.
    Logs every page visit, API call, and user interaction.
    """

    async def dispatch(self, request: Request, call_next):
        # Skip logging for static files, health checks, and all API endpoints
        # API endpoints are logged separately by APILoggingMiddleware
        skip_paths = ['/static/', '/_next/', '/favicon.ico', '/health', '/api/']
        if any(request.url.path.startswith(path) for path in skip_paths):
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

        # Determine activity type based on path and method
        activity_type = self._determine_activity_type(request.url.path, request.method)

        # Log the activity
        db = SessionLocal()
        try:
            log_user_activity(
                db=db,
                activity_type=activity_type.value,  # Use .value to get the string value
                user_id=user_id,
                request=request,
                description=f"{request.method} {request.url.path}"
            )
        except Exception as e:
            print(f"Failed to log request: {e}")
        finally:
            db.close()

        # Process the request
        response = await call_next(request)

        # Calculate response time
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)

        return response

    def _determine_activity_type(self, path: str, method: str) -> UserActivityType:
        """Determine the activity type based on the request path and method"""

        # Authentication
        if '/auth/login' in path:
            return UserActivityType.LOGIN
        if '/auth/register' in path:
            return UserActivityType.REGISTER
        if '/auth/logout' in path:
            return UserActivityType.LOGOUT

        # Products
        if '/products' in path:
            if method == 'GET':
                return UserActivityType.PRODUCT_VIEW
            elif method == 'POST':
                return UserActivityType.PRODUCT_CREATE
            elif method in ['PUT', 'PATCH']:
                return UserActivityType.PRODUCT_UPDATE
            elif method == 'DELETE':
                return UserActivityType.PRODUCT_DELETE

        # Cart
        if '/cart' in path:
            if method == 'POST':
                return UserActivityType.CART_ADD
            elif method == 'DELETE':
                return UserActivityType.CART_REMOVE
            return UserActivityType.CART_VIEW

        # Orders
        if '/orders' in path:
            if method == 'POST':
                return UserActivityType.ORDER_CREATE
            elif method in ['PUT', 'PATCH']:
                return UserActivityType.ORDER_UPDATE
            return UserActivityType.ORDER_VIEW

        # Admin pages
        if '/admin' in path:
            return UserActivityType.ADMIN_ACTION

        # Default to page view
        return UserActivityType.PAGE_VIEW
