# Suggested Commands for Mock Exam Booking System

## Development Commands
```bash
# Backend development
npm install                    # Install backend dependencies
npm run dev                    # Start backend with nodemon
npm test                       # Run Jest tests
npm run test:coverage          # Run tests with coverage report

# Frontend development
cd frontend
npm install                    # Install frontend dependencies
npm run dev                    # Start Vite dev server
npm run build                  # Build for production
npm run preview                # Preview production build

# Testing
npm run test:integration       # Run integration tests
npm run test:e2e              # Run end-to-end tests
npm run verify:hubspot-schema  # Verify HubSpot schema

# Deployment
vercel                         # Deploy to staging
vercel --prod                  # Deploy to production
```

## Development Workflow
1. Make changes to code
2. Test locally with `npm run dev` (backend) and `npm run dev` (frontend)
3. Run tests with `npm test`
4. Deploy with `vercel --prod`

## File Structure Navigation
- `/api/` - Serverless function endpoints
- `/frontend/src/` - React application source
- `/api/_shared/` - Shared utilities (auth, validation, HubSpot)
- `/tests/` - Test suites
- `vercel.json` - Deployment configuration