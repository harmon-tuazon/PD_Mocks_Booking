# PRD: Mock Exam Booking System
## PrepDoctors HubSpot Automation Framework

---

## Executive Summary

### Feature Overview
Full-stack booking system for mock exams (Situational Judgment, Clinical Skills, Mini-mock) using HubSpot as the single source of truth. Replaces Calendly to save $5,400/year with a custom React/Express/Vercel solution.

### Business Impact
- **Cost Savings**: $5,400/year (eliminate Calendly)
- **Efficiency Gain**: 75% reduction in manual booking administration
- **Error Reduction**: 95% fewer booking errors with real-time validation
- **Implementation Timeline**: 5 days (vs traditional 6-8 weeks)

### Technical Stack
- **Frontend**: React 18 with Vite
- **Backend**: Express.js on Vercel Serverless Functions
- **Database**: HubSpot CRM (no local database)
- **Hosting**: Vercel with serverless architecture
- **Validation**: Joi schemas for all inputs

---

## Comprehensive Research & Context

### HubSpot API Documentation
- **CRM API v3 Reference**: https://developers.hubspot.com/docs/api-reference/crm-custom-objects-v3/guide
- **Associations v4**: https://developers.hubspot.com/docs/api-reference/crm-associations-v4/guide
- **Search API**: https://developers.hubspot.com/docs/guides/api/crm/search
- **Private Apps**: https://developers.hubspot.com/docs/guides/apps/private-apps/overview
- **Rate Limits**: https://developers.hubspot.com/docs/api/usage-details

### Critical HubSpot Rate Limits
- **Private Apps**: 190 calls/10 seconds (up to 250 with capacity pack)
- **Retry Strategy**: Exponential backoff on 429 errors
- **Best Practice**: Batch operations, use search with larger page sizes

### HubSpot Object IDs (from codebase)
```javascript
const HUBSPOT_OBJECTS = {
  'contacts': '0-1',
  'deals': '0-3',
  'courses': '0-410',
  'transactions': '2-47045790',
  'payment_schedules': '2-47381547',
  'credit_notes': '2-41609496',
  'campus_venues': '2-41607847',
  'enrollments': '2-41701559',
  'lab_stations': '2-41603799',
  'bookings': '2-50158943',      // PRIMARY for this feature
  'mock_exams': '2-50158913'     // PRIMARY for this feature
};
```

### Vercel Best Practices 2024
- **Functions Directory**: `/api` for serverless functions
- **Timeout**: 60 seconds maximum per function
- **Fluid Compute**: Multiple requests share single instance
- **Edge Caching**: 5-minute TTL for exam data
- **Environment Variables**: All secrets in Vercel dashboard

### React/Express Patterns
- **React Router v6**: Client-side routing
- **Custom Hooks**: `useBookingFlow` for state management
- **Error Boundaries**: Catch and display errors gracefully
- **Express Middleware**: CORS, rate limiting, validation
- **Async/Await**: All API calls use async patterns

---

## Implementation Blueprint

### Project Structure
```
mocks_booking/
├── api/                          # Vercel serverless functions
│   ├── mock-exams/
│   │   ├── available.js         # GET available exams
│   │   └── validate-credits.js  # POST credit validation
│   ├── bookings/
│   │   ├── create.js           # POST new booking
│   │   ├── [id].js            # GET/DELETE booking
│   │   └── my-bookings.js     # GET user's bookings
│   └── _shared/
│       ├── hubspot.js         # HubSpot API wrapper
│       ├── validation.js      # Joi schemas
│       └── auth.js            # Authentication helpers
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── ExamTypeSelector.jsx
│   │   │   ├── ExamSessionsList.jsx
│   │   │   ├── BookingForm.jsx
│   │   │   ├── BookingConfirmation.jsx
│   │   │   └── shared/
│   │   │       ├── CapacityBadge.jsx
│   │   │       ├── CreditAlert.jsx
│   │   │       └── SessionTimer.jsx
│   │   ├── hooks/
│   │   │   └── useBookingFlow.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── package.json               # Root package.json
├── vercel.json               # Vercel configuration
└── .env                      # Environment variables
```

### Core Implementation Tasks (In Order)

#### Phase 1: Project Setup (Tasks 1-4)
1. **Initialize Node.js Project**
   ```bash
   npm init -y
   npm install express cors dotenv joi axios
   npm install -D @types/node nodemon
   ```

2. **Create Vercel Configuration**
   ```json
   // vercel.json
   {
     "functions": {
       "api/**/*.js": {
         "maxDuration": 60
       }
     },
     "rewrites": [
       { "source": "/api/(.*)", "destination": "/api/$1" },
       { "source": "/(.*)", "destination": "/frontend/dist/$1" }
     ]
   }
   ```

3. **Setup HubSpot Service Layer**
   ```javascript
   // api/_shared/hubspot.js
   const axios = require('axios');

   class HubSpotService {
     constructor() {
       this.token = process.env.HS_PRIVATE_APP_TOKEN;
       this.baseURL = 'https://api.hubapi.com';
       this.retryDelay = 1000;
       this.maxRetries = 3;
     }

     async apiCall(method, path, data = null, attempt = 1) {
       try {
         const response = await axios({
           method,
           url: `${this.baseURL}${path}`,
           data,
           headers: {
             'Authorization': `Bearer ${this.token}`,
             'Content-Type': 'application/json'
           }
         });
         return response.data;
       } catch (error) {
         if (error.response?.status === 429 && attempt < this.maxRetries) {
           await new Promise(r => setTimeout(r, this.retryDelay * attempt));
           return this.apiCall(method, path, data, attempt + 1);
         }
         throw error;
       }
     }
   }
   ```

4. **Create Validation Schemas**
   ```javascript
   // api/_shared/validation.js
   const Joi = require('joi');

   const schemas = {
     creditValidation: Joi.object({
       student_id: Joi.string().pattern(/^[A-Z0-9]+$/).required(),
       email: Joi.string().email().required(),
       mock_type: Joi.string().valid('Situational Judgment', 'Clinical Skills', 'Mini-mock').required()
     }),

     bookingCreation: Joi.object({
       mock_exam_id: Joi.string().required(),
       contact_id: Joi.string().required(),
       enrollment_id: Joi.string().required(),
       student_id: Joi.string().pattern(/^[A-Z0-9]+$/).required(),
       name: Joi.string().min(2).max(100).required(),
       email: Joi.string().email().required(),
       dominant_hand: Joi.boolean().required()
     })
   };
   ```

#### Phase 2: API Endpoints (Tasks 5-8)

5. **Implement Available Mock Exams Endpoint**
   ```javascript
   // api/mock-exams/available.js
   module.exports = async (req, res) => {
     // Get mock_type from query params
     // Search HubSpot for active exams
     // Calculate available slots (capacity - total_bookings)
     // Cache results for 5 minutes
     // Return formatted data
   };
   ```

6. **Implement Credit Validation Endpoint**
   ```javascript
   // api/mock-exams/validate-credits.js
   module.exports = async (req, res) => {
     // Validate input with Joi
     // Search Contact by student_id and email
     // Fetch appropriate credits based on mock_type
     // Calculate total available credits
     // Return eligibility status
   };
   ```

7. **Implement Booking Creation Endpoint**
   ```javascript
   // api/bookings/create.js
   module.exports = async (req, res) => {
     // Validate all inputs
     // Check for duplicate booking (booking_id)
     // Verify capacity not exceeded
     // Create Booking object
     // Create associations (Contact, Mock Exam, Enrollment)
     // Update total_bookings counter
     // Deduct user credits
     // Return confirmation
   };
   ```

8. **Implement User Bookings Endpoint**
   ```javascript
   // api/bookings/my-bookings.js
   module.exports = async (req, res) => {
     // Find Contact by student_id/email
     // Get associated Bookings
     // Sort by date (upcoming first)
     // Return formatted list
   };
   ```

#### Phase 3: React Frontend (Tasks 9-13)

9. **Setup React Application**
   ```bash
   cd frontend
   npm create vite@latest . -- --template react
   npm install axios react-router-dom
   npm install -D tailwindcss postcss autoprefixer @vitejs/plugin-react
   ```

10. **Create Booking Flow Hook**
    ```javascript
    // frontend/src/hooks/useBookingFlow.js
    const useBookingFlow = (mockExamId) => {
      // Manage multi-step form state
      // Handle credit verification
      // Submit booking
      // Track errors and loading states
    };
    ```

11. **Implement Main Components**
    - ExamTypeSelector: Landing page with type selection
    - ExamSessionsList: Display available sessions with capacity
    - BookingForm: Two-step form (verify → details)
    - BookingConfirmation: Success page with QR code

12. **Setup Routing**
    ```javascript
    // frontend/src/App.jsx
    <Routes>
      <Route path="/book" element={<ExamTypeSelector />} />
      <Route path="/book/exams" element={<ExamSessionsList />} />
      <Route path="/book/:mockExamId" element={<BookingForm />} />
      <Route path="/booking/confirmation/:bookingId" element={<BookingConfirmation />} />
      <Route path="/my-bookings" element={<MyBookings />} />
    </Routes>
    ```

13. **Implement Error Handling**
    - Error boundaries for component crashes
    - Inline validation messages
    - Network error recovery
    - Session timeout handling

#### Phase 4: Integration & Testing (Tasks 14-17)

14. **Create Integration Tests**
    ```javascript
    // tests/integration/booking.test.js
    describe('Booking Flow', () => {
      test('Happy path: successful booking', async () => {});
      test('Error: insufficient credits', async () => {});
      test('Error: exam at capacity', async () => {});
      test('Edge: last slot booking', async () => {});
    });
    ```

15. **Implement E2E Tests**
    ```javascript
    // tests/e2e/full-flow.test.js
    // Test complete user journey from landing to confirmation
    ```

16. **Performance Testing**
    - Load test with 500 concurrent users
    - Verify sub-2 second page loads
    - Test HubSpot rate limit handling
    - Validate 60-second timeout compliance

17. **Security Validation**
    - Input sanitization testing
    - CSRF protection verification
    - Environment variable security
    - Rate limiting verification

#### Phase 5: Deployment (Tasks 18-20)

18. **Deploy to Vercel Staging**
    ```bash
    vercel --env-add HS_PRIVATE_APP_TOKEN
    vercel --env-add CRON_SECRET
    vercel
    ```

19. **Production Deployment**
    ```bash
    vercel --prod
    ```

20. **Post-Deployment Verification**
    - Health check endpoints
    - Monitor first bookings
    - Review HubSpot audit trails
    - Check error logs

---

## Validation Gates

### Code Quality Checks
```bash
# Linting
npm run lint

# Type checking (if using TypeScript)
npm run typecheck

# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Test coverage (must be >70%)
npm run test:coverage
```

### HubSpot Validation
```bash
# Test HubSpot connection
node helper_scripts/fetch-hubspot-schema-simple.js

# Verify object properties exist
npm run verify:hubspot-schema

# Test rate limiting
npm run test:rate-limits
```

### Performance Validation
```bash
# Load testing
npm run test:load

# Lighthouse audit
npm run audit:lighthouse

# Bundle size check
npm run build:analyze
```

---

## Critical Implementation Notes

### HubSpot Integration Gotchas
1. **Rate Limiting**: Implement exponential backoff, max 3 retries
2. **Association IDs**: Use v4 API for associations, not v3
3. **Property Types**: All HubSpot properties return as strings
4. **Search Limits**: Max 100 results per search, implement pagination
5. **Batch Operations**: Max 100 records per batch operation

### Vercel Deployment Gotchas
1. **Cold Starts**: Minimize dependencies, use dynamic imports
2. **Function Size**: Keep under 50MB uncompressed
3. **Environment Variables**: Set via Vercel dashboard, not .env
4. **CORS**: Configure in each function, not globally
5. **Timeouts**: Design for 60-second max, aim for 10-second typical

### React/Frontend Gotchas
1. **State Management**: Use React Context for global state
2. **Form Validation**: Client-side mirrors server-side Joi schemas
3. **Error Boundaries**: Wrap each major component
4. **Mobile First**: Design for mobile, enhance for desktop
5. **Accessibility**: ARIA labels, keyboard navigation, screen readers

### Security Requirements
1. **Input Validation**: Every endpoint validates with Joi
2. **SQL Injection**: Not applicable (HubSpot handles)
3. **XSS Prevention**: Sanitize all user inputs
4. **CSRF Protection**: Use tokens for state-changing operations
5. **Secrets Management**: Never commit tokens, use env vars

---

## Success Metrics & KPIs

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Booking Success Rate | >95% | Analytics tracking |
| Page Load Time | <2 seconds | Lighthouse |
| API Response Time | <500ms | Vercel Analytics |
| Test Coverage | >70% | Jest coverage |
| Error Rate | <2% | Error monitoring |
| User Satisfaction | >4.5/5 | Post-booking survey |

---

## References & Documentation

### External Resources
- [HubSpot CRM API v3 Guide](https://developers.hubspot.com/docs/api-reference/crm-custom-objects-v3/guide)
- [Vercel Functions Documentation](https://vercel.com/docs/functions)
- [React Router v6 Guide](https://reactrouter.com/en/main/start/tutorial)
- [Joi Validation Documentation](https://joi.dev/api/)
- [Express on Vercel Guide](https://vercel.com/docs/frameworks/backend/express)

### Internal Resources
- Feature Specification: `/features/mocksBooking.md`
- HubSpot Schema: `/documentation/HUBSPOT_SCHEMA_DOCUMENTATION.md`
- Agent Coordination: `/AGENT_DEVELOPER_COORDINATION_RULES.md`
- Screenshots: `/screenshots/` (UI reference)

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| HubSpot Rate Limits | Medium | High | Implement caching, batch operations |
| Capacity Race Conditions | Low | High | Use atomic operations, pessimistic locking |
| Vercel Timeouts | Low | Medium | Break into smaller functions, optimize queries |
| Credit Calculation Errors | Low | High | Comprehensive testing, audit trails |
| User Experience Issues | Medium | Medium | Progressive enhancement, mobile-first design |

---

## Appendix: Code Examples

### HubSpot Search Pattern
```javascript
async function searchMockExams(mockType, isActive = true) {
  const searchPayload = {
    filterGroups: [{
      filters: [
        { propertyName: 'is_active', operator: 'EQ', value: isActive.toString() },
        { propertyName: 'mock_type', operator: 'EQ', value: mockType }
      ]
    }],
    properties: ['exam_date', 'capacity', 'total_bookings', 'location'],
    sorts: [{ propertyName: 'exam_date', direction: 'ASCENDING' }],
    limit: 20
  };

  return await hubspot.apiCall('POST', '/crm/v3/objects/2-50158913/search', searchPayload);
}
```

### React Booking Hook Pattern
```javascript
const useBookingFlow = (initialMockExamId) => {
  const [step, setStep] = useState('verify');
  const [bookingData, setBookingData] = useState({
    mockExamId: initialMockExamId,
    studentId: '',
    email: '',
    name: '',
    dominantHand: true,
    credits: null,
    contactId: null
  });

  const verifyCredits = useCallback(async (studentId, email) => {
    // Implementation
  }, []);

  const submitBooking = useCallback(async () => {
    // Implementation
  }, [bookingData]);

  return { step, bookingData, verifyCredits, submitBooking };
};
```

### Vercel Function Pattern
```javascript
// api/bookings/create.js
const { validateInput } = require('../_shared/validation');
const { HubSpotService } = require('../_shared/hubspot');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate input
    const data = await validateInput(req.body, 'bookingCreation');

    // Process booking
    const hubspot = new HubSpotService();
    const result = await hubspot.createBooking(data);

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Booking creation error:', error);
    return res.status(error.status || 500).json({
      success: false,
      error: error.message || 'An error occurred'
    });
  }
};
```

---

## Implementation Confidence Score: 9/10

### Scoring Rationale
- **+2**: Complete feature specification with all requirements documented
- **+2**: Comprehensive HubSpot API patterns and object IDs identified
- **+2**: Clear Vercel deployment strategy with best practices
- **+2**: Detailed validation gates and testing approach
- **+1**: Risk mitigation and error handling strategies defined
- **-1**: No existing codebase patterns to follow (greenfield project)

This PRD provides sufficient context for one-pass implementation with high confidence of success.

---

**Author**: Claude (via generate-prd command)
**Date**: September 18, 2025
**Framework Version**: 1.0.0
**Status**: Ready for Implementation