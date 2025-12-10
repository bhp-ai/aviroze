# Aviroze E-Commerce Platform

Premium Women's Professional Fashion E-Commerce Platform

## Project Structure

```
aviroze/
├── frontend/          # Next.js frontend application
│   ├── app/          # Next.js app directory
│   │   ├── products/ # Product listing and detail pages
│   │   ├── cart/     # Shopping cart page
│   │   ├── layout.tsx
│   │   └── page.tsx  # Homepage
│   ├── components/   # Reusable React components
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── ProductCard.tsx
│   ├── lib/         # Utility functions and data
│   │   └── products.ts
│   └── types/       # TypeScript type definitions
│       └── index.ts
└── backend/         # Python FastAPI backend
    ├── app/
    │   ├── models/  # Data models
    │   ├── routes/  # API routes
    │   ├── schemas/ # Pydantic schemas
    │   └── services/# Business logic
    ├── main.py      # FastAPI application entry
    └── requirements.txt
```

## Features

### Frontend (Next.js + TypeScript + Tailwind CSS)
- Responsive design with mobile-first approach
- Product listing with grid layout
- Product detail pages with image gallery
- Shopping cart functionality
- Clean minimalist UI inspired by modern e-commerce
- Optimized images with Next.js Image component
- SEO-friendly with metadata

### Backend (Python + FastAPI)
- RESTful API architecture
- Product management
- User authentication & authorization
- Order processing
- Payment integration ready (Stripe)
- Database models for MongoDB/PostgreSQL

## Getting Started

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
- Windows:
```bash
venv\Scripts\activate
```
- macOS/Linux:
```bash
source venv/bin/activate
```

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Create a `.env` file from the example:
```bash
copy .env.example .env  # Windows
cp .env.example .env    # macOS/Linux
```

6. Configure your environment variables in `.env`

7. Run the backend server:
```bash
uvicorn main:app --reload
```

8. API will be available at [http://localhost:8000](http://localhost:8000)
9. API documentation at [http://localhost:8000/docs](http://localhost:8000/docs)

## Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Image Optimization:** Next.js Image

### Backend
- **Framework:** FastAPI
- **Language:** Python 3.11+
- **Database:** MongoDB / PostgreSQL (configurable)
- **Authentication:** JWT
- **Payment:** Stripe (planned)
- **Email:** SMTP (configurable)

## API Endpoints (Planned)

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Users
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/me` - Get current user
- `PUT /api/users/me` - Update current user

### Orders
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/status` - Update order status (admin)

### Cart
- `GET /api/cart` - Get user cart
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items/:id` - Update cart item
- `DELETE /api/cart/items/:id` - Remove cart item

## Design Philosophy

Inspired by premium fashion e-commerce sites like This Is April, focusing on:
- Clean, minimalist aesthetic
- High-quality product imagery
- Smooth user experience
- Mobile-first responsive design
- Professional typography
- Intuitive navigation

## Next Steps

1. Implement shopping cart with React Context
2. Add user authentication (JWT)
3. Connect frontend to backend API
4. Implement payment processing
5. Add product search and filters
6. Implement order management
7. Add admin dashboard
8. Set up database (MongoDB or PostgreSQL)
9. Deploy to production

## License

Proprietary - All rights reserved

## Contact

For questions or support, please contact the development team.
