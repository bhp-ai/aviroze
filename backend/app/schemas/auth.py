from pydantic import BaseModel, EmailStr

class Token(BaseModel):
    access_token: str
    token_type: str
    user_role: str

class TokenData(BaseModel):
    email: str | None = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "user"  # admin or user
