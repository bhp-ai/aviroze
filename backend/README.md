# Aviroze E-Commerce Backend API

FastAPI backend with PostgreSQL database for the Aviroze fashion e-commerce platform.

## Features

- **Authentication**: JWT-based authentication with role-based access control (admin/user)
- **Products Management**: Full CRUD operations with category filtering
- **User Management**: Admin panel for managing users
- **Product Comments**: Users can leave reviews and ratings
- **Analytics Dashboard**: Statistics and insights for admins
- **Categories**: Outerwear, Tops, Bottoms, Dresses, Accessories, Shoes

## Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Authentication**: JWT (python-jose)
- **Password Hashing**: Passlib with bcrypt

## Prerequisites

- Python 3.9+
- PostgreSQL 12+
- pip

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Up PostgreSQL Database

Create a PostgreSQL database named `aviroze`:

```sql
CREATE DATABASE aviroze;
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update with your settings:

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/aviroze
SECRET_KEY=your-very-secret-key-here
```

### 4. Initialize Database

The database tables will be created automatically when you run the server for the first time.

### 5. Run the Server

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Products
- `GET /api/products/` - List all products (with filtering)
- `GET /api/products/{id}` - Get single product
- `POST /api/products/` - Create product (admin only)
- `PUT /api/products/{id}` - Update product (admin only)
- `DELETE /api/products/{id}` - Delete product (admin only)
- `GET /api/products/categories/list` - Get available categories

### Users
- `GET /api/users/` - List all users (admin only)
- `GET /api/users/{id}` - Get single user (admin only)
- `POST /api/users/` - Create user (admin only)
- `PUT /api/users/{id}` - Update user (admin only)
- `DELETE /api/users/{id}` - Delete user (admin only)

### Comments
- `GET /api/comments/` - List comments (with product filter)
- `GET /api/comments/{id}` - Get single comment
- `POST /api/comments/` - Create comment (authenticated)
- `PUT /api/comments/{id}` - Update comment (owner/admin)
- `DELETE /api/comments/{id}` - Delete comment (owner/admin)
- `GET /api/comments/admin/all` - Get all comments with product info (admin only)

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard statistics (admin only)
- `GET /api/analytics/products/trending` - Get trending products (admin only)

## Product Categories

- Outerwear
- Tops
- Bottoms
- Dresses
- Accessories
- Shoes

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_token>
```

## Default Admin User

After running migrations, create an admin user via the register endpoint:

```json
{
  "username": "admin",
  "email": "admin@aviroze.com",
  "password": "your_secure_password",
  "role": "admin"
}
```

## Database Schema

### Users
- id, username, email, password_hash, role (admin/user), status (active/inactive), timestamps

### Products
- id, name, description, price, category, stock, image, discount fields, voucher fields, timestamps

### Product Comments
- id, product_id, user_id, rating (1-5), comment, timestamps

## Development

For development with auto-reload:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Production

For production, use a production ASGI server like Gunicorn with Uvicorn workers:

```bash
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```
