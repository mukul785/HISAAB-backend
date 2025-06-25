# HISAAB Backend (Node.js/Express/PostgreSQL)

## Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root with:
   ```env
   DATABASE_URL=postgres://user:password@localhost:5432/hisaab
   JWT_SECRET=your_jwt_secret
   PORT=3000
   ```

3. Run database migrations (if using Sequelize CLI) or let Sequelize sync models automatically.

4. Start the server:
   ```bash
   npm run dev
   # or
   npm start
   ```

## Project Structure
- `src/models/` - Sequelize models
- `src/controllers/` - Route handlers
- `src/routes/` - Express routers
- `src/middleware/` - Auth, validation, error handling
- `src/app.js` - Main app entry
- `src/db.js` - Sequelize DB connection

## API
Implements endpoints as per OpenAPI spec in `openapi.json`. 