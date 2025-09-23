# 🚀 Product Improvements Request Template

**Project**: Mock Exam Booking System
**Date**: 09-18-2025
**Requested By**: __Harmon_______
**Priority**: [ ] Low [ ] Medium [x] High [ ] Critical

---

## 📋 **Improvement Summary**

### **Brief Description** (1-2 sentences)
Change the general flow of the application. Instead of the landing page showing the exam types to choose from, make the landing page the asks the user to input their `student id` and their `email`. Once they have "logged-in", only then will they be able to choose which mock type to view. 

```
```

### **Category** (Check one)
- [ ] 🐛 **Bug Fix** - Something isn't working as expected
- [ ] ✨ **New Feature** - Add new functionality
- [X] 🔧 **Enhancement** - Improve existing functionality
- [X] 🎨 **UI/UX** - Frontend design or user experience changes
- [ ] ⚡ **Performance** - Speed or efficiency improvements
- [ ] 🔒 **Security** - Security-related changes
- [ ] 📚 **Documentation** - Update docs or help content
- [ ] 🏗️ **Infrastructure** - Backend, deployment, or architecture changes

---

## 🎯 **Current State vs Desired State**

### **What's happening now?**
```
As of the moment, the landing page shows the users the mock types to choose from. Then, they will be presented with the different available sessions to book from. After choosing a specific mock exam session, only then will they be asked for their `student id` and their `email`. Once they input these, they will submit using the "Check Eligibility" button. The application will then perform checks whether this trainee has enough tokens to proceed with booking. 

```

### **What should happen instead?**
```
The landing page should straight away ask the user to input their `student id` and their `email` as a form of login. Once they have submit the form, the application should perform a GET request to Hubspot Contact (`0-1`) object to check if there is indeed an existing user under that student id. If there is no user under that student ID, keep the existing behavior of showing a snack bar showing that there is no user under that student id (no redirection needed). If there is a user under that student ID, then redirect them to a page where they can select which mock type to choose.

Once users have selected which mock type, show them available mock exam sessions (Mock Exams (`2-50158913`)). Once they have selected a specific Mock Exams (`2-50158913`) object. They will then be asked for the following information via a field :`dominant_hand`: a boolean with true for right handed option and false for left handed. Once they click a submit button to confirm their booking only then will the following behaviors take place:
-validation of token occurs. if they don't have enough tokens they are redirected to an error page
-once validation passes and it is confirmed that there are enough tokens, then the appropriate Bookings (`2-50158943`) will be created on Hubspot and associated properly.

**IMPORTANT: DO NOT CHANGE THE ORDER OF OPERATIONS WHEN IT COMES TO VALIDATION AND BOOKINGS OBJECT CREATION. USER TOKENS MUST BE VALIDATED FIRST BEFORE OBJECT CREATION AND ASSOCIATION**

```

### **Why is this change needed?**
```
This rearrangement of the User Experience is vital to provide a more seamless experience for users. It does not make sense that users will be able to go through the rest of the pages if they are not even authorized to do so.

```

---

## 📍 **Technical Details**

### **Affected Components** (Check all that apply)
- [ ] 🔙 **Backend API** (`/api/`)
- [X] 🖥️ **Frontend React App** (`/frontend/`)
- [X] 🏢 **HubSpot Integration** (CRM objects, properties, associations)
- [ ] ☁️ **Vercel Deployment** (functions, domains, environment)
- [ ] 🧪 **Tests** (unit, integration, e2e)
- [X] 📖 **Documentation** (README, API docs, comments)
- [ ] Other: ___________

### **Specific Files/Endpoints** (if known)
- frontend\src\components\BookingConfirmation.jsx
- frontend\src\components\BookingForm.jsx
- frontend\src\components\ExamTypeSelector.jsx
- frontend\src\components\ErrorBoundary.jsx

### **Data Requirements**
- [ ] No data changes needed
- [ ] Update existing HubSpot properties
- [ ] Create new HubSpot properties
- [ ] Modify HubSpot object associations
- [ ] Change API request/response format
- [ ] Other: ___________

---

## 👥 **User Impact**

### **Who will this affect?**
- [X] Students booking exams
- [ ] PrepDoctors admin staff
- [ ] System administrators
- [ ] All users
- [ ] Other: ___________

### **User Story** (optional)
```
- As a client booking a slot, I want to login using only my student ID before even seeing the dates so that I can see if I do have a profile to begin with.

```

---

## 🧪 **Testing Requirements**

### **How should this be tested?**
- [X] Manual testing is sufficient
- [ ] Unit tests needed
- [ ] Integration tests needed
- [ ] Test with real HubSpot data
- [ ] Load testing required
- [ ] Other: ___________

### **Test Scenarios**
```
[Describe specific scenarios to test]
```

---

## ⚠️ **Risk Assessment**

### **Potential Risks** (Check all that apply)
- [ ] Could break existing bookings
- [ ] Might affect HubSpot data integrity
- [ ] Could impact system performance
- [X] May require downtime
- [ ] Risk of data loss
- [ ] No significant risks identified
- [ ] Other: ___________

### **Backwards Compatibility**
- [ ] Fully backwards compatible
- [ ] Requires migration of existing data
- [ ] Breaking change - users need to be notified
- [X] Not applicable

---

## 📅 **Timeline & Dependencies**

### **Urgency Level**
- [X] **Immediate** - System is broken, fix ASAP
- [ ] **This Week** - Important for operations
- [ ] **Next Sprint** - Would improve user experience
- [ ] **Future Release** - Nice to have improvement

### **Dependencies** (Check if any apply)
- [ ] Requires HubSpot configuration changes
- [ ] Needs environment variable updates
- [ ] Depends on external API changes
- [ ] Requires coordination with other systems
- [X] None identified

### **Estimated Effort**
- [ ] **Small** (< 2 hours) - Simple config or minor fix
- [X] **Medium** (2-8 hours) - New endpoint or component
- [ ] **Large** (1-3 days) - Major feature addition
- [ ] **Unknown** - Need investigation first

---

## 🎨 **Visual/Design Requirements**

### **Mockups or Examples** (if applicable)
```
[Attach screenshots, mockups, or describe visual changes needed]
```

### **Design Specifications**
```
[Colors, fonts, layout requirements, responsive behavior, etc.]
```

---

## 📊 **Success Criteria**

### **How will we know this is complete?**
```
- The user will be able to "check-in" first before even accessing the rest of the routes of the application. 
- Token/credits validation when user submits form for confirming booking 
- Bookings object creation occurs after the credit validation occurs

```

### **Metrics to Track** (if applicable)
- [ ] Booking success rate
- [ ] Page load time
- [ ] Error rate reduction
- [X] User satisfaction
- [ ] Other: ___________

---

## 📝 **Additional Context**

### **Technical Notes**

**Current React Router Structure**
```jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ExamTypeSelector from './components/ExamTypeSelector';
import ExamSessionsList from './components/ExamSessionsList';
import BookingForm from './components/BookingForm';
import BookingConfirmation from './components/BookingConfirmation';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <div className="min-h-screen">
          <Routes>
            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/book" replace />} />

            {/* Main booking flow */}
            <Route path="/book" element={<ExamTypeSelector />} />
            <Route path="/book/exams" element={<ExamSessionsList />} />
            <Route path="/book/:mockExamId" element={<BookingForm />} />
            <Route path="/booking/confirmation/:bookingId" element={<BookingConfirmation />} />


            {/* Error pages */}
            <Route path="/book/error/insufficient-credits" element={<InsufficientCreditsError />} />
            <Route path="/book/error/exam-full" element={<ExamFullError />} />
            <Route path="/book/session-expired" element={<SessionExpiredError />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </ErrorBoundary>
    </Router>
  );
}


const InsufficientCreditsError = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="card max-w-md text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-error-100 rounded-full mb-4">
        <svg className="w-8 h-8 text-error-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Insufficient Credits</h1>
      <p className="text-gray-600 mb-6">
        You don't have enough credits to book this exam. Please purchase additional credits or contact support for assistance.
      </p>
      <div className="space-y-3">
        <button className="btn-primary w-full">Purchase Credits</button>
        <a href="/book" className="btn-outline w-full block">
          View Other Exam Types
        </a>
      </div>
    </div>
  </div>
);

const ExamFullError = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="card max-w-md text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-warning-100 rounded-full mb-4">
        <svg className="w-8 h-8 text-warning-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Exam Session Full</h1>
      <p className="text-gray-600 mb-6">
        Sorry, this exam session has reached capacity. Please select another available date.
      </p>
      <a href="/book/exams" className="btn-primary">
        View Other Available Dates
      </a>
    </div>
  </div>
);

const SessionExpiredError = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="card max-w-md text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-warning-100 rounded-full mb-4">
        <svg className="w-8 h-8 text-warning-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Session Expired</h1>
      <p className="text-gray-600 mb-6">
        Your booking session has expired for security reasons. Please start over to continue with your booking.
      </p>
      <a href="/book" className="btn-primary">
        Start Over
      </a>
    </div>
  </div>
);

const NotFound = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Page Not Found</h2>
      <p className="text-gray-600 mb-6">
        The page you're looking for doesn't exist.
      </p>
      <a href="/book" className="btn-primary">
        Go to Booking
      </a>
    </div>
  </div>
);

export default App;
```

### **UI References**

**Pictures of Current Pages**
screenshots\CheckinAndCredit Validation.png
screenshots\CurrentTypeSelection.png
screenshots\SessionSelection.png
---

## 🔄 **Implementation Approach** (Optional - for complex requests)

### **Suggested Solution**

### **Alternative Approaches**
```
[Any alternative ways to solve this problem]
```

---

## ✅ **Implementation Checklist** (Once executed finish this checklist)

- [ ] Requirements analysis completed
- [ ] PRD generated (if needed) - Not needed for this simple fix
- [ ] Implementation completed
- [ ] Tests written and passing - Test script created: `test-fixed-associations.js`
- [ ] Code deployed to staging - N/A (direct to production)
- [ ] Stakeholder review completed - Pending user testing
- [ ] Deployed to production - Deployed to: https://mocksbooking-cnnxg9d2l-farismarei-7539s-projects.vercel.app
- [ ] Documentation updated - Added detailed logging for debugging
- [ ] Success criteria verified - Pending user verification

---

## 📞 **Contact Information**

**Requester**: ___________
**Email**: ___________
**Best time to discuss**: ___________

---

**🎯 Ready to Submit?**
Save this file as `improvements/YYYY-MM-DD-[improvement-name].md` and let me know it's ready for implementation!

---

*Template Version: 1.0 | Framework: PrepDoctors HubSpot Automation | Updated: 2025-01-19*