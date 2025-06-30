# ContractGuard MVP

A web application that helps small construction companies analyze subcontractor agreements for risky terms.

## Overview

ContractGuard automatically identifies risky contract terms and generates easy-to-understand risk assessment reports. This helps small contractors avoid dangerous contracts without expensive legal fees.

## Features

- PDF contract upload and analysis
- Identifies 5 key risk patterns:
  - Pay-when-paid clauses
  - Unlimited liability terms
  - Short notice requirements
  - No compensation for delays
  - Termination for convenience
- Generates downloadable PDF risk reports
- User accounts with contract history
- Simple, intuitive interface

## Tech Stack

- **Frontend**: React.js, Bootstrap 5
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT
- **PDF Processing**: PDF.js, Puppeteer
- **AI Analysis**: OpenAI API

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- PostgreSQL
- OpenAI API key

### Installation

1. Clone the repository
```bash
git clone [repository-url]
cd contractguard-mvp
```

2. Install backend dependencies
```bash
cd backend
npm install
```

3. Install frontend dependencies
```bash
cd ../frontend
npm install
```

4. Set up environment variables
```bash
# Backend (.env)
DATABASE_URL=postgresql://user:password@localhost:5432/contractguard
JWT_SECRET=your-jwt-secret
OPENAI_API_KEY=your-openai-api-key
PORT=5000

# Frontend (.env)
REACT_APP_API_URL=http://localhost:5000/api
```

5. Run database migrations
```bash
cd backend
npm run migrate
```

6. Start the development servers
```bash
# Backend
npm run dev

# Frontend (in another terminal)
cd frontend
npm start
```

## Project Structure

```
contractguard-mvp/
├── frontend/          # React application
├── backend/           # Express API server
│   ├── src/
│   │   ├── routes/    # API endpoints
│   │   ├── controllers/
│   │   ├── models/    # Database models
│   │   ├── middleware/
│   │   ├── services/  # Business logic
│   │   └── utils/
│   └── database/      # Migration files
└── README.md
```

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/contracts/upload` - Upload contract for analysis
- `GET /api/contracts` - Get user's contracts
- `GET /api/contracts/:id` - Get specific contract analysis
- `GET /api/contracts/:id/pdf` - Download PDF report

## Development

This is an MVP focused on core functionality. Future versions may include:
- OCR for scanned documents
- Word document support
- Negotiation suggestions
- Multiple user roles
- Mobile app

## License

[License Type]