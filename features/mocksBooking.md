# Feature Template
## PrepDoctors HubSpot Automation Framework
---

## FEATURE: [Feature Name]
**Brief Description**: This is a full-stack application for mock exam bookings. It will use Hubspot as the database, Express.js as the backend framework, React.js as the frontend framework.

**Business Value**: It will allow us to host our own booking system based on objects and information on Hubspot. This will allow us to have the same flexibility as any booking system such Calendly without the need of using these external systems. 

**Framework Alignment**: It will use Hubspot as the database and single source of truth. It will make use of the following Hubspot objects:
- Bookings (`2-50158943`)
- Mock Exams (`2-50158913`)
- Enrollments (`2-41701559`)
- Contacts (`0-1`)

**Logic Flow**
The frontend booking page will make use of Mock Exams (`2-50158913`) as the primary object. Using the `exam_date` property it will show a date when an exam session is bookable using the front end. The `capacity` property then determines how many slots can be booked for each given `mock_exam_id`. The front end will retrieve all Mock Exams (`2-50158913`) with the `is_active` set to the value True. It will then display these as bookable sessions.

First a user will be asked to input their student id and email. Once we have those responses, an API call will be used to fetch certain properties from the Contacts (`0-1`) object depending on `mock-type` property of the Mock Exams (`2-50158913`) object using those properties to do a search for that specific user on Hubspot. The following logic will dictate what property from Contacts (`0-1`) object will be fetched:
- If the `mock-type` property is equal to 'Situational Judgment': fetch `sj_credits` and `shared_mock_credits`
- If the `mock-type` property is equal to 'Clinical Skills': fetch `cs_credits` and `shared_mock_credits`
- If the `mock-type` property is equal to 'Mini-mock': fetch `sjmini_credits`

Then using those properties, it will check if the corresponding property is not equal to 0 or null. 
- If it is equal to or less than 0 or null then the user will be redirected to an error page. 
- If it is greater than 0 then the user will be allowed to book. 

When a user books for a slot in a mock exam, on the back end, a new Bookings (`2-50158943`) object will be created. 
That object will have the following properties whose values will be recorded from responses to form fields:
- `dominant_hand`: a boolean with true for right handed option and false for left handed
- `email`: a string reflecting the email of the user booking a slot
- `name`: a string reflecting the name of the user booking a slot
The `booking_id` field of the Bookings (`2-50158943`) object, which is the primary display field of the object, will be comprised of the following: "`name` - `exam_date`".
Each booking object created will then be checked against the capacity set. Associated booking objects cannot surpass the set capacity.
For each associated Bookings (`2-50158943`) object, it will increment the `total_bookings` property of the Mock Exams (`2-50158913`) object.

That newly created booking object should then be associated to the appropriate Contacts (`0-1`), Mock Exams (`2-50158913`), and Enrollments (`2-41701559`). 


## User Journey

**User Happy Path**
Happy Path Flow
Step 1: Browse Available Exams
User Action: Navigate to the booking page
System Response: Display all active mock exam sessions depending on a filter based `mock-type`. No option to view all types together. A filter must always be in place. 

Fetch all Mock Exams where is_active = true
Show exam dates (exam_date) and available slots (capacity)
Group by mock type (Situational Judgment, Clinical Skills, Mini-mock)

User Interface Display:
Available Mock Exams:
┌─────────────────────────────────────────┐
│ 📅 January 15, 2025 - Clinical Skills  │
│    Available slots: 8/10                │
│                                         │
│ 📅 January 20, 2025 - Situational      │
│    Judgment                            │
│    Available slots: 5/15                │
│                                         │
│ 📅 January 22, 2025 - Mini-mock        │
│    Available slots: 12/20               │
└─────────────────────────────────────────┘

Step 2: Select Exam & Enter Details
User Action: Click on desired exam session (e.g., January 20, 2025 - Situational Judgment)
System Response: Display registration form
User Input:
Student ID: STU123456
Email: john.doe@example.com
Action: Click "Check Eligibility"


Step 3: Credit Verification
System Process:
API call to HubSpot Contacts (0-1) to find user
Based on mock type = 'Situational Judgment', fetch:

sj_credits: 3
shared_mock_credits: 2

Validation Logic:
Total available credits = sj_credits + shared_mock_credits
Total available credits = 3 + 2 = 5
Result: Credits > 0 ✅ User eligible to book
User Feedback:
✅ Eligibility Confirmed
You have 5 credits available for this exam type.

Step 4: Complete Booking Details
User Action: Fill out booking form
Form Fields:
Field | Value | Type
Name  | John Doe |String
Dominant Hand | Right-handed | Boolean (true)
Email (confirmed) | john.doe@example.com | String
User Action: Click "Book Exam"

Step 5: Create Booking
System Process:
Create Bookings Object (2-50158943):

json   {
     "booking_id": "John Doe - 2025-01-20",
     "name": "John Doe",
     "email": "john.doe@example.com",
     "dominant_hand": true
   }

Create Associations:
Link to Contact record (via student ID/email)
Link to Mock Exam record (January 20, 2025 session)
Link to Enrollment record (student's active enrollment)


Update System State:
Reduce Mock Exam capacity by 1
Deduct 1 credit from user's account


Step 6: Confirmation
User Confirmation Display:
🎉 Booking Confirmed!

Exam: Situational Judgment Mock
Date: January 20, 2025
Booking ID: John Doe - 2025-01-20
Remaining credits: 4

Process Flow Diagram
mermaidgraph TD
    A[User visits booking page] --> B[System displays active exams]
    B --> C[User selects exam & enters ID/email]
    C --> D{Credits > 0?}
    D -->|Yes| E[User completes booking form]
    E --> F[System creates Booking object]
    F --> G[System creates associations]
    G --> H[System updates capacity & credits]
    H --> I[User receives confirmation]
    
    style D fill:#90EE90
    style I fill:#90EE90

Credit Validation Rules
Mock Type | Credits Checked | Minimum Required
Situational Judgment | sj_credits + shared_mock_credits | > 0
Clinical Skills | cs_credits + shared_mock_credits |> 0
Mini-mock | sjmini_credits | > 0

Success Criteria Checklist
✅ Pre-booking Validation:

 Active mock exams displayed correctly
 Available capacity shown accurately
 Student ID and email accepted

✅ Credit Verification:

 Correct credit types fetched based on mock type
 Total credits calculated properly
 User has sufficient credits (> 0)

✅ Booking Creation:

 All required fields provided
 Booking ID generated correctly (Name - Date format)
 Booking object created successfully

✅ Association & Updates:

 Booking associated with Contact
 Booking associated with Mock Exam
 Booking associated with Enrollment
 Total Bookings counted and aggregated as needed
 User credits deducted by 1

✅ User Feedback:

 Confirmation message displayed
 Booking details shown correctly
 Confirmation email sent
 Remaining credits displayed

**Unhappy Path: Insufficient Credits**
Overview
This section describes the user journey when a doctor/student attempts to book a mock exam but lacks sufficient credits. The system redirects them to an error page with appropriate messaging and next steps.
Insufficient Credits Flow

Step 1-2: Initial Navigation (Same as Happy Path)
User Action: Navigate to booking page and select exam
User sees: Same available exams display as happy path

Step 3: Failed Credit Verification
User Input:
Student ID: DOC789012
Email: jane.smith@example.com
Selected Exam: Clinical Skills Mock

System Process:
API call to HubSpot Contacts (0-1) to find user
Based on mock type = 'Clinical Skills', fetch:
cs_credits: 0
shared_mock_credits: 0

Validation Logic:
Total available credits = cs_credits + shared_mock_credits
Total available credits = 0 + 0 = 0
Result: Credits ≤ 0 ❌ User NOT eligible to book

Step 4: Error Redirection
System Response: Redirect to error page
Error Page Display:
❌ Insufficient Credits

You currently have 0 credits available for Clinical Skills Mock exams.

To book this exam, you need at least 1 credit.

What you can do:
- Purchase additional credits through your account dashboard
- Contact support at support@example.com
- Check if you have credits for other exam types

[Purchase Credits] [View Other Exams] [Contact Support]


---

## Requirements Summary

### Functional Requirements
1. **Mock Exam Display & Filtering**: : The system must fetch and display all active mock exam sessions from HubSpot, filtered by mock type (Situational Judgment, Clinical Skills, or Mini-mock). No option to view all types together - a filter must always be applied.
2. **Student Eligibility Verification**: The system must validate student eligibility by:
Accepting student ID and email input
Fetching appropriate credit properties from HubSpot Contacts based on mock type:
Situational Judgment: sj_credits + shared_mock_credits
Clinical Skills: cs_credits + shared_mock_credits
Mini-mock: sjmini_credits
Blocking booking if credits ≤ 0 with appropriate error messaging
3. **Booking Creation & Management**: The system must:
Create new Booking objects with properties: name, email, dominant_hand
Generate booking_id in format: "{name} - {exam_date}"
Associate bookings with Contact, Mock Exam, and Enrollment records
Increment total_bookings counter on Mock Exam object
Ensure total bookings never exceed exam capacity
4. **Credit Deduction**: Upon successful booking, the system must deduct 1 credit from the appropriate user credit balance in HubSpot.
5. **Capacity Management**: Display real-time available slots (capacity - total_bookings) and prevent overbooking.
6. **Duplicate Bookings Management**: Users must not be able to book twice for the same date. A check on `booking_id` must be done to ensure that the trainee has no previous booking under the same session. 

### Non-Functional Requirements

**Performance:**
Page load time < 2 seconds for exam listings
API response time < 3 seconds for eligibility checks
Real-time capacity updates without page refresh

**Security:**
Validate all user inputs server-side
Secure API endpoints with appropriate authentication
Protect student PII (email, student ID) in transit and storage
Prevent duplicate bookings through idempotency checks

**Scalability:**
Support up to 500 concurrent users during peak booking periods
Handle up to 1000 bookings per day
Optimize HubSpot API calls to stay within rate limits (100 requests/10 seconds)

**Vercel Constraints:**
All API functions must complete within 60-second timeout
Implement pagination for large data sets
Use caching strategies for frequently accessed Mock Exam data
Break complex operations into smaller, atomic functions
## 

---

## HubSpot Integration Requirements

### Objects Involved
- **Primary Object**: Mock Exams (2-50158913) - Central object for exam sessions
- **Secondary Objects**: Bookings (2-50158943) - Records individual student bookings, Contacts (0-1) - Student/doctor profiles with credit balances, Enrollments (2-41701559) - Student enrollment records

### Properties Required
```yaml
existing_properties:
existing_properties:
  # Mock Exams (2-50158913)
  - mock_exams.exam_date: "Date of the mock exam session"
  - mock_exams.capacity: "Maximum number of bookable slots"
  - mock_exams.is_active: "Boolean flag for active/inactive sessions"
  - mock_exams.mock_type: "Type of exam (Situational Judgment/Clinical Skills/Mini-mock)"
  - mock_exams.total_bookings: "Counter for current bookings"
  
  # Contacts (0-1)
  - contacts.sj_credits: "Situational Judgment exam credits"
  - contacts.shared_mock_credits: "Shared credits usable for SJ or CS exams"
  - contacts.cs_credits: "Clinical Skills exam credits"
  - contacts.sjmini_credits: "Mini-mock exam credits"
  - contacts.email: "Contact email address"
  - contacts.student_id: "Unique student identifier"
  
  # Bookings (2-50158943)
  - bookings.booking_id: "Primary display field (name - exam_date format)"
  - bookings.name: "Student name"
  - bookings.email: "Student email"
  - bookings.dominant_hand: "Boolean (true=right, false=left)"
```

### HubSpot Operations
- Create new custom objects - Create new Booking records for each registration
- Extend existing object properties - Not required, existing properties sufficient
- Query/search operations required:
  Search Mock Exams by is_active=true and mock_type
  Search Contacts by student_id and email
  Count associated Bookings for capacity validation
- Batch operations needed - Single record operations sufficient
- Association Management: Create bidirectional associations between:
  Booking → Contact (many-to-one)
  Booking → Mock Exam (many-to-one)
  Booking → Enrollment (many-to-one)
- Property Updates:
  Increment total_bookings on Mock Exam after successful booking
  Decrement appropriate credit property on Contact after booking
- Rate Limiting Considerations:
  Implement request queuing to stay within HubSpot's 100 requests/10 seconds limit
  Cache Mock Exam data with 5-minute TTL to reduce API calls
  Use batch read operations where possible for efficiency

## Hubspot APIs 
```yaml
hubspot_endpoints:
  # CONTACTS (0-1) ENDPOINTS
  - method: GET
    path: https://api.hubapi.com/crm/v3/objects/0-1/124340560202
    purpose: "Fetch contact details to get student_id and credit properties"
    query: "?properties=student_id,sj_credits,cs_credits,sjmini_credits,shared_mock_credits,firstname,lastname,email"
    sample_output: |
      {
        "id": "124340560202",
        "properties": {
          "student_id": "STU123456",
          "sj_credits": "3",
          "cs_credits": "2",
          "sjmini_credits": "5",
          "shared_mock_credits": "2",
          "firstname": "John",
          "lastname": "Doe",
          "email": "john.doe@example.com"
        },
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-18T14:22:00.000Z"
      }
    
  - method: POST
    path: https://api.hubapi.com/crm/v3/objects/0-1/search
    purpose: "Search for contact by student_id and email"
    sample_input: |
      {
        "filterGroups": [{
          "filters": [
            {
              "propertyName": "student_id",
              "operator": "EQ",
              "value": "STU123456"
            },
            {
              "propertyName": "email",
              "operator": "EQ",
              "value": "john.doe@example.com"
            }
          ]
        }],
        "properties": ["student_id", "firstname", "lastname", "sj_credits", "cs_credits", "sjmini_credits", "shared_mock_credits", "hs_obj_id"],
        "limit": 1
      }
    sample_output: |
      {
        "total": 1,
        "results": [{
          "id": "124340560202",
          "properties": {
            "student_id": "STU123456",
            "firstname": "John",
            "lastname": "Doe",
            "sj_credits": "3",
            "cs_credits": "2",
            "sjmini_credits": "5",
            "shared_mock_credits": "2"
          }
        }]
      }
    
  - method: PATCH
    path: https://api.hubapi.com/crm/v3/objects/0-1/124340560202
    purpose: "Update contact credits after booking"
    sample_input: |
      {
        "properties": {
          "sj_credits": "2",
          "shared_mock_credits": "2"
        }
      }
    sample_output: |
      {
        "id": "124340560202",
        "properties": {
          "sj_credits": "2",
          "shared_mock_credits": "2"
        },
        "updatedAt": "2025-01-18T15:45:00.000Z"
      }
    
  # MOCK EXAMS (2-50158913) ENDPOINTS  
  - method: POST
    path: https://api.hubapi.com/crm/v3/objects/2-50158913/search
    purpose: "Search for active mock exams filtered by type"
    sample_input: |
      {
        "filterGroups": [{
          "filters": [
            {
              "propertyName": "is_active",
              "operator": "EQ",
              "value": "true"
            },
            {
              "propertyName": "mock_type",
              "operator": "EQ",
              "value": "Situational Judgment"
            }
          ]
        }],
        "properties": ["exam_date", "capacity", "total_bookings", "mock_type", "location", "hs_obj_id"],
        "sorts": [{
          "propertyName": "exam_date",
          "direction": "ASCENDING"
        }],
        "limit": 20
      }
    sample_output: |
      {
        "total": 3,
        "results": [
          {
            "id": "mock_exam_001",
            "properties": {
              "exam_date": "2025-01-20",
              "capacity": "15",
              "total_bookings": "10",
              "mock_type": "Situational Judgment",
              "location": "Calgary"
            }
          },
          {
            "id": "mock_exam_002",
            "properties": {
              "exam_date": "2025-01-25",
              "capacity": "20",
              "total_bookings": "5",
              "mock_type": "Situational Judgment",
              "location": "Mississauga"
            }
          }
        ]
      }
    
  - method: PATCH
    path: https://api.hubapi.com/crm/v3/objects/2-50158913/${ObjectID}
    purpose: "Increment total_bookings count after creating booking"
    sample_input: |
      {
        "properties": {
          "total_bookings": "11"
        }
      }
    
  # BOOKINGS (2-50158943) ENDPOINTS
  - method: POST
    path: https://api.hubapi.com/crm/v3/objects/2-50158943
    purpose: "Create new booking object"
    sample_input: |
      {
        "properties": {
          "booking_id": "John Doe - 2025-01-20",
          "dominant_hand": "true",
          "email": "john.doe@example.com",
          "name": "John Doe"
        }
      }
    sample_output: |
      {
        "id": "booking_12345",
        "properties": {
          "booking_id": "John Doe - 2025-01-20",
          "dominant_hand": "true",
          "email": "john.doe@example.com",
          "name": "John Doe"
        },
        "createdAt": "2025-01-18T16:00:00.000Z",
        "updatedAt": "2025-01-18T16:00:00.000Z"
      }
    
  - method: POST
    path: https://api.hubapi.com/crm/v3/objects/2-50158943/search
    purpose: "Check for existing booking to prevent duplicates"
    sample_input: |
      {
        "filterGroups": [{
          "filters": [
            {
              "propertyName": "booking_id",
              "operator": "EQ",
              "value": "John Doe - 2025-01-20"
            }
          ]
        }],
        "limit": 1
      }
    sample_output: |
      {
        "total": 0,
        "results": []
      }
    
  - method: DELETE
    path: https://api.hubapi.com/crm/v3/objects/2-50158943/${ObjectID}
    purpose: "Cancel a booking"
    sample_output: |
      {
        "status": "success"
      }
    
  # ENROLLMENTS (2-41701559) ENDPOINTS
  - method: POST
    path: https://api.hubapi.com/crm/v3/objects/2-41701559/search
    purpose: "Find student's enrollments for association"
    sample_input: |
      {
        "filterGroups": [{
          "filters": [
            {
              "propertyName": "contact_record_id",
              "operator": "EQ",
              "value": "124340560202"
            },
            {
              "propertyName": "enrollment_status",
              "operator": "EQ",
              "value": "Registered"
            }
          ]
        }],
        "properties": ["enrollment_id", "course_id", "enrollment_status"],
        "limit": 10
      }
    sample_output: |
      {
        "total": 2,
        "results": [
          {
            "id": "enrollment_001",
            "properties": {
              "enrollment_id": "John Doe-NDECC Clinical Skills",
              "course_id": "CS-2025-01",
              "enrollment_status": "Registered"
            }
          }
        ]
      }
    
  # ASSOCIATIONS ENDPOINTS
  - method: PUT
    path: https://api.hubapi.com/crm/v3/objects/2-50158943/${fromObjectID}/associations/0-1/${toObjectID}
    purpose: "Associate booking with contact"
    sample_output: |
      {
        "status": "success"
      }
    
  - method: PUT
    path: https://api.hubapi.com/crm/v3/objects/2-50158943//${fromObjectID}/associations/2-50158913/{toObjectID}
    purpose: "Associate booking with mock exam"
    sample_output: |
      {
        "status": "success"
      }
    
  - method: GET
    path: https://api.hubapi.com/crm/v4/objects/2-50158913/${ObjectID}/associations/2-50158943/
    purpose: "Get all bookings for a specific mock exam"
    sample_output: |
      {
        "results": [
          {
            "toObjectId": "${ObjectID}",
            "associationTypes": [{
              "category": "USER_DEFINED",
              "typeId": 1292,
              "label": null
            }]
          },
        ]
      }
    
  - method: GET
    path: https://api.hubapi.com/crm/v4/objects/2-50158943/${ObjectID}/associations/
    purpose: "Get all bookings for a specific contact"
    query: "?limit=50"
    sample_output: |
      {
        "results": [
          {
            "toObjectId": "booking_12345",
            "associationTypes": [{
              "category": "USER_DEFINED",
              "typeId": 1001
            }]
          },
          {
            "toObjectId": "booking_12347",
            "associationTypes": [{
              "category": "USER_DEFINED",
              "typeId": 1001
            }]
          }
        ]
      }
    
  # BATCH OPERATIONS
  - method: POST
    path: https://api.hubapi.com/crm/v3/objects/2-50158943/batch/create
    purpose: "Create multiple bookings at once"
    sample_input: |
      {
        "inputs": [
          {
            "properties": {
              "booking_id": "John Doe - 2025-01-20",
              "dominant_hand": "true",
              "email": "john.doe@example.com",
              "name": "John Doe"

  

```
---

## API Requirements

### Endpoints Needed
```yaml
endpoints:
  # Retrieve available mock exams
  - method: GET
    path: /api/mock-exams/available
    purpose: "Fetch all active mock exam sessions filtered by type with available capacity"
    input: 
      query_params:
        - mock_type: "string (required) - Options: 'Situational Judgment', 'Clinical Skills', 'Mini-mock'"
        - include_capacity: "boolean (optional, default: true) - Include current booking count"
    output: |
      {
        "success": boolean,
        "data": [
          {
            "mock_exam_id": "string",
            "exam_date": "YYYY-MM-DD",
            "mock_type": "string",
            "capacity": number,
            "total_bookings": number,
            "available_slots": number,
            "location": "string",
            "is_active": boolean
          }
        ]
      }

  # Validate user credits
  - method: POST
    path: /api/mock-exams/validate-credits
    purpose: "Check if user has sufficient credits for the selected mock exam type"
    input: |
      {
        "student_id": "string (required)",
        "email": "string (required)",
        "mock_type": "string (required) - Options: 'Situational Judgment', 'Clinical Skills', 'Mini-mock'"
      }
    output: |
      {
        "success": boolean,
        "data": {
          "eligible": boolean,
          "available_credits": number,
          "credit_breakdown": {
            "specific_credits": number,
            "shared_credits": number
          },
          "contact_id": "string",
          "enrollment_id": "string"
        },
        "error": "string (only if not eligible)"
      }

  # Create a booking
  - method: POST
    path: /api/bookings/create
    purpose: "Create a new booking for a mock exam slot and handle all associations"
    input: |
      {
        "mock_exam_id": "string (required)",
        "contact_id": "string (required)",
        "enrollment_id": "string (required)",
        "student_id": "string (required)",
        "name": "string (required)",
        "email": "string (required)",
        "dominant_hand": boolean (required) - true for right, false for left
      }
    output: |
      {
        "success": boolean,
        "data": {
          "booking_id": "string",
          "booking
```

---

## User Interface Requirements

```yaml
html_endpoints:
  # Landing page - Select exam type
  - method: GET
    path: /book
    purpose: "Landing page where users select which type of mock exam to book"
    response: "HTML page with exam type selection (Situational Judgment, Clinical Skills, Mini-mock)"
    features:
      - Exam type cards with descriptions
      - Links to filtered exam listings
      - Optional: Display user's available credits if logged in

  # Available exams listing
  - method: GET
    path: /book/exams
    purpose: "Display available mock exam sessions filtered by type"
    query_params:
      - type: "string (required) - Filter by mock type"
      - location: "string (optional) - Filter by location"
    response: "HTML page showing available exam sessions with booking buttons"
    features:
      - Calendar view or list view toggle
      - Real-time capacity indicators
      - Color-coded availability (green: available, yellow: limited, red: full)
      - Booking button for each session

  # Credit verification form
  - method: GET
    path: /book/verify/:mock_exam_id
    purpose: "Form to verify student credentials and check credit eligibility"
    url_params:
      - mock_exam_id: "string (required)"
    response: "HTML form for entering student ID and email"
    features:
      - Student ID input field
      - Email input field
      - Selected exam details display
      - "Check Eligibility" button
      - Back to exams link

  # Booking form
  - method: GET
    path: /book/details/:mock_exam_id
    purpose: "Detailed booking form after credit verification passes"
    url_params:
      - mock_exam_id: "string (required)"
    query_params:
      - student_id: "string (required) - Pre-filled from verification"
      - email: "string (required) - Pre-filled from verification"
    response: "HTML form for completing booking details"
    features:
      - Pre-filled student information
      - Name confirmation field
      - Dominant hand selection (radio buttons)
      - Exam details summary
      - Available credits display
      - Terms and conditions checkbox
      - "Confirm Booking" button

  # Booking confirmation page
  - method: GET
    path: /booking/confirmation/:booking_id
    purpose: "Success page showing booking confirmation details"
    url_params:
      - booking_id: "string (required)"
    response: "HTML confirmation page with booking details and next steps"
    features:
      - Success message with confetti animation
      - Booking reference number
      - Exam details (date, time, location, address)
      - QR code or barcode for check-in
      - "Add to Calendar" button
      - "Download Confirmation" PDF button
      - "Book Another Exam" link

  # Error page - Insufficient credits
  - method: GET
    path: /book/error/insufficient-credits
    purpose: "Error page shown when user lacks credits"
    query_params:
      - type: "string - Mock type attempted"
      - available: "number - Current credits available"
      - required: "number - Credits required"
    response: "HTML error page with credit purchase options"
    features:
      - Clear error message
      - Current credit balance display
      - "Purchase Credits" button
      - "View Other Exam Types" link
      - "Contact Support" link

  # Error page - Exam full
  - method: GET
    path: /book/error/exam-full
    purpose: "Error page shown when exam reaches capacity during booking"
    query_params:
      - mock_exam_id: "string - Exam that's full"
    response: "HTML error page with alternative options"
    features:
      - Apology message
      - "View Other Available Dates" button
      - "Join Waitlist" option (if applicable)
      - "Contact Support" link

  # Session timeout/expired
  - method: GET
    path: /book/session-expired
    purpose: "Page shown when booking session times out"
    response: "HTML page informing session expiration"
    features:
      - Session expired message
      - "Start Over" button
      - Explanation of why sessions expire


```

### Pages/Components Needed

**IMPORTANT: USE ULTRATHINK TO GO THRU /screenshots folder and see the pegs of each page. Use the same component styling**

### 1. **ExamTypeSelector** (`/book`)
Landing page with exam type selection cards

- **Purpose**: User selects which type of mock exam they want to book
- **Data Displayed**: 
  - Three card options: "Situational Judgment", "Clinical Skills", "Mini-mock"
  - Brief description of each exam type
  - Duration and format information
- **User Actions**: 
  - Click on exam type card to view available sessions
  - Navigation to filtered exam listings

### 2. **ExamSessionsList** (`/book/exams`)
Available exam sessions with real-time capacity

- **Purpose**: User browses available dates and selects an exam session to book
- **Data Displayed**: 
  - List of exam sessions with date, time, location
  - Live capacity indicators (e.g., "8/10 slots available")
  - Color-coded availability status (green/yellow/red)
  - Location address for each session
- **User Actions**: 
  - Filter by location (if multiple locations)
  - Click "Select" button on available sessions
  - View "Full" status on booked-out sessions
  - Toggle between list/calendar view

### 3. **BookingForm** (`/book/:mock_exam_id`)
Two-step form on single page

- **Purpose**: User verifies eligibility and completes booking in one flow
- **Data Displayed**: 
  - Selected exam details (date, type, location) in header
  - Step 1: Simple credential form
  - Step 2: Available credits and booking details (after verification)
  - Inline validation messages
- **User Actions**: 
  - Step 1: Enter student ID and email, click "Verify"
  - Step 2: Confirm name, select dominant hand (radio buttons)
  - Submit booking
  - See inline errors without page reload

### 4. **BookingConfirmation** (`/booking/confirmation/:booking_id`)
Success page with booking details

- **Purpose**: User receives booking confirmation and next steps
- **Data Displayed**: 
  - Success checkmark animation
  - Booking reference number (e.g., "John Doe - 2025-01-20")
  - Complete exam details (date, time, location, address)
  - Remaining credits balance
  - QR code for check-in
- **User Actions**: 
  - Download confirmation as PDF
  - Add to calendar (.ics file)
  - Book another exam (return to start)
  - View all bookings

### 5. **MyBookings** (`/my-bookings`)
User's booking dashboard

- **Purpose**: User manages their existing bookings
- **Data Displayed**: 
  - Upcoming bookings list with dates and status
  - Past bookings history
  - Credits remaining counter
- **User Actions**: 
  - Enter student ID/email to view bookings
  - Cancel upcoming bookings (with confirmation modal)
  - Download past confirmations
  - Book new exam

## Shared Components

### 6. **CapacityBadge**
Reusable availability indicator

- **Purpose**: Show real-time slot availability
- **Data Displayed**: 
  - Available slots (e.g., "3 slots left")
  - Visual indicator (green/yellow/red background)
- **User Actions**: None (display only)

### 7. **CreditAlert**
Inline credit validation message

- **Purpose**: Show credit eligibility status
- **Data Displayed**: 
  - Current credit balance
  - Required credits
  - Error or success message
- **User Actions**: 
  - Link to purchase credits (if insufficient)
  - Dismiss message

### 8. **SessionTimer**
Booking session timeout warning

- **Purpose**: Alert user of session expiration
- **Data Displayed**: 
  - Countdown timer (e.g., "2 minutes remaining")
  - Session expiry warning
- **User Actions**: 
  - Extend session
  - Continue booking

## Mobile Responsiveness

- ✅ **Must work on mobile devices**
- ❌ **Desktop-only acceptable**
- ✅ **Specific mobile considerations:**
  - Single column layout on mobile (no side-by-side elements)
  - Large touch targets (minimum 44px height for buttons)
  - Bottom-fixed CTA buttons for easy thumb reach
  - Simplified calendar view (show 1 week at a time)
  - Native date pickers for date selection
  - Minimal scrolling between form steps
  - Auto-zoom prevention on input focus
  - Sticky header with selected exam details
  - Swipe gestures for calendar navigation
  - Bottom sheet modals instead of popups

## Calendly-like Simplicity Features

### Progressive Disclosure
- Only show necessary fields at each step
- Hide complex options behind "Advanced" toggles

### Persistent Context
- Always show selected exam details in header
- Breadcrumb navigation showing current step

### Smart Validation
- Inline validation without page reloads
- Real-time credit checking
- Capacity updates every 30 seconds

### User-Friendly Forms
- Auto-save progress in session storage
- Pre-fill known information from previous bookings
- Maximum 3-4 fields visible per step
- Single primary CTA per screen

### Visual Feedback
- Step indicators (e.g., "Step 1 of 2")
- Loading states for all async operations
- Success animations on completion
- Clear error messages with recovery actions

### Minimal Cognitive Load
- One decision per screen
- Clear, action-oriented button labels
- Consistent layout patterns
- No jargon or technical terms

## Design System Requirements

### Colors
- **Primary**: Brand blue for CTAs
- **Success**: Green for available slots
- **Warning**: Yellow for limited availability
- **Error**: Red for full/errors
- **Neutral**: Grays for secondary text

### Typography
- **Headings**: Clear hierarchy (H1-H4)
- **Body**: Readable size (min 16px)
- **Mobile**: Larger touch targets

### Spacing
- **Consistent padding**: 16px mobile, 24px desktop
- **Clear sections**: Visual separation between steps
- **Breathing room**: Adequate whitespace

### Interactions
- **Hover states**: Desktop only
- **Touch feedback**: Mobile tap highlights
- **Loading states**: Skeleton screens or spinners
- **Transitions**: Smooth 200ms animations
---

## Security & Validation Requirements

### Input Validation
```javascript
// Example Joi schema structure needed
const featureSchema = Joi.object({
  field1: Joi.string().required(),
  field2: Joi.number().positive().required(),
  field3: Joi.string().pattern(/^[A-Z0-9]+$/).optional()
});
```


---
## Testing Requirements

### Test Scenarios

#### 1. **Happy Path**: Complete successful booking workflow
- User navigates to `/book` and selects "Clinical Skills" exam type
- System displays available sessions with real-time capacity
- User selects January 20, 2025 session (5/15 slots available)
- User enters valid student ID (STU123456) and email
- System validates and shows 5 available credits (3 cs_credits + 2 shared_mock_credits)
- User completes form with name and dominant hand selection
- System creates Booking object with ID "John Doe - 2025-01-20"
- System associates Booking with Contact, Mock Exam, and Enrollment
- System decrements user credits by 1 and updates mock exam capacity
- User receives confirmation page with booking details
- Confirmation email sent to user

#### 2. **Error Cases**: System handles failures gracefully

**Insufficient Credits**
- User attempts to book Situational Judgment exam
- System fetches sj_credits (0) and shared_mock_credits (0)
- System displays inline error: "You have 0 credits. At least 1 credit required."
- System shows "Purchase Credits" link and alternative exam types

**Exam Reaches Capacity During Booking**
- User A and User B simultaneously book last slot
- User A completes booking first
- User B receives error: "This session is now full"
- System suggests alternative dates

**Invalid Student ID**
- User enters non-existent student ID
- System returns "Student ID not found in our records"
- User prompted to verify ID or contact support

**Network Timeout**
- HubSpot API call exceeds 60-second Vercel limit
- System returns graceful error with retry option
- Partial booking data saved in session storage

#### 3. **Edge Cases**: Boundary conditions and unusual inputs

**Last Slot Booking**
- Mock exam has 1/10 slots remaining
- Multiple users view availability simultaneously
- First user to complete booking gets slot
- Other users see real-time update to "Full"

**Credit Boundary Cases**
- User has exactly 1 credit and books exam
- System correctly decrements to 0
- User cannot book another exam until credits purchased

**Special Characters in Names**
- User name contains apostrophes (O'Brien), hyphens (Smith-Jones), or accents (José)
- System properly escapes and stores in HubSpot
- Booking ID generated correctly: "José O'Brien - 2025-01-20"

**Timezone Handling**
- User in different timezone books exam
- System displays times in location's local timezone
- Confirmation shows both local and user's timezone

#### 4. **Integration Tests**: Cross-system validation

**HubSpot Association Chain**
- Verify Booking creates with all associations:
  - Booking → Contact (correct student)
  - Booking → Mock Exam (correct session)
  - Booking → Enrollment (active enrollment)
- Verify rollback if any association fails

**Credit Deduction Sync**
- Confirm credits deducted in Contact object
- Verify total_bookings incremented in Mock Exam
- Ensure atomic transaction (all or nothing)

**Multi-location Booking**
- User books exams at different locations (Mississauga, Vancouver)
- System correctly assigns location-specific properties
- Address mapping works for all locations

### Test Data Needed
```yaml
test_data:
  # Valid booking inputs
  valid_booking:
    - student_id: "STU123456"
      email: "john.doe@example.com"
      name: "John Doe"
      dominant_hand: true
      mock_exam_id: "ME-2025-01-20-CS"
      expected_result: 
        booking_id: "John Doe - 2025-01-20"
        status: "success"
        credits_remaining: 4
    
    - student_id: "DOC789012"
      email: "jane.smith@example.com"
      name: "Jane Smith"
      dominant_hand: false
      mock_exam_id: "ME-2025-01-22-SJ"
      expected_result:
        booking_id: "Jane Smith - 2025-01-22"
        status: "success"
        credits_remaining: 2

  # Invalid inputs
  invalid_inputs:
    - student_id: ""
      email: "test@example.com"
      expected_error: "Student ID is required"
    
    - student_id: "INVALID123"
      email: "fake@example.com"
      expected_error: "Student not found in system"
    
    - student_id: "STU123456"
      email: "notmatching@example.com"
      expected_error: "Email does not match student record"
    
    - student_id: "STU123456"
      email: "john.doe@example"  # Invalid email format
      expected_error: "Please enter a valid email address"

  # Mock exam test data
  mock_exams:
    - mock_exam_id: "ME-2025-01-15-CS"
      exam_date: "2025-01-15"
      mock_type: "Clinical Skills"
      capacity: 10
      total_bookings: 2
      is_active: true
      location: "Mississauga"
    
    - mock_exam_id: "ME-2025-01-20-SJ"
      exam_date: "2025-01-20"
      mock_type: "Situational Judgment"
      capacity: 15
      total_bookings: 10
      is_active: true
      location: "Vancouver"
    
    - mock_exam_id: "ME-2025-01-22-MM"
      exam_date: "2025-01-22"
      mock_type: "Mini-mock"
      capacity: 20
      total_bookings: 20  # Full exam
      is_active: true
      location: "Calgary"

  # Contact credit scenarios
  credit_test_data:
    - student_id: "STU_NO_CREDITS"
      sj_credits: 0
      cs_credits: 0
      shared_mock_credits: 0
      sjmini_credits: 0
      expected_behavior: "Block all bookings"
    
    - student_id: "STU_SJ_ONLY"
      sj_credits: 3
      cs_credits: 0
      shared_mock_credits: 0
      sjmini_credits: 0
      expected_behavior: "Can only book Situational Judgment"
    
    - student_id: "STU_SHARED"
      sj_credits: 0
      cs_credits: 0
      shared_mock_credits: 5
      sjmini_credits: 0
      expected_behavior: "Can book SJ or CS but not Mini-mock"


```
**Performance Testing**
Expected Load:
Peak: 500 concurrent users during registration windows
Average: 50-100 bookings per hour
Burst: Up to 1000 users viewing availability simultaneously


**Response Time Requirements:**
Page load: < 2 seconds
API responses: < 500ms for reads, < 2 seconds for writes
Real-time capacity updates: Every 30 seconds
Credit validation: < 1 second

**Vercel Limits Considerations:**
Function timeout: 60 seconds maximum
Booking creation must complete within 30 seconds
Implement request queuing for high-traffic periods
Use edge caching for exam availability data
Background jobs for email notifications (non-blocking)

## Success Criteria

### Definition of Done

- [x] **All functional requirements implemented**
  - Exam browsing and filtering functional
  - Credit validation system working
  - Booking creation with all associations
  - Capacity management accurate

- [x] **Security validation in place**
  - Input sanitization for all forms
  - Student ID/email verification
  - Rate limiting on booking endpoint
  - CSRF protection enabled

- [x] **>70% test coverage achieved**
  - Unit tests for all utilities
  - Integration tests for HubSpot operations
  - E2E tests for booking flow

- [x] **HubSpot integration working correctly**
  - All custom objects properly linked
  - Properties updating accurately
  - Associations maintained

- [x] **booking_id linking maintained**
  - Unique booking IDs generated (name - date format)
  - Proper association to all related objects

- [x] **Documentation updated**
  - API documentation complete
  - User guide created
  - Admin procedures documented

- [x] **Performance requirements met**
  - Sub-2 second page loads
  - 99.9% uptime during booking windows
  - Handles 500 concurrent users

- [x] **Error handling implemented**
  - All error states have user-friendly messages
  - Graceful fallbacks for API failures
  - Session recovery after timeout

### Acceptance Tests

1. **End-to-End Booking Flow**: Student can successfully book an available mock exam with sufficient credits
   - Navigate through all pages without errors
   - Complete booking within 5 minutes
   - Receive confirmation immediately

2. **Credit Validation Accuracy**: System correctly calculates available credits based on mock type
   - SJ exam uses `sj_credits` + `shared_mock_credits`
   - CS exam uses `cs_credits` + `shared_mock_credits`
   - Mini-mock uses only `sjmini_credits`

3. **Capacity Management**: No overbooking occurs even under concurrent load
   - Total bookings never exceed set capacity
   - Real-time updates prevent race conditions
   - Full exams clearly marked as unavailable

4. **Multi-Location Support**: Bookings work correctly for all 4 locations
   - Mississauga, Vancouver, Montreal, Calgary addresses display correctly
   - Location filtering works properly
   - Timezone handling accurate

5. **Data Integrity**: All HubSpot objects maintain proper relationships
   - Every Booking has Contact, Mock Exam, and Enrollment associations
   - No orphaned records created
   - Audit trail maintained

6. **Mobile Booking Experience**: Complete booking flow works on mobile devices
   - All forms usable on touch screens
   - No horizontal scrolling required
   - Buttons meet 44px minimum touch target

### Business Impact Metrics

#### Before (Current State)
- Using external booking systems (Calendly) at **$15/user/month**
- Limited integration with HubSpot requiring manual data entry
- No real-time credit validation causing booking errors
- **20% of bookings** require manual correction
- **2-3 hours daily** admin time managing bookings

#### After (Expected State)
- **Zero external booking system costs** (saving ~$5,400/year)
- Full HubSpot integration with automatic data sync
- Real-time credit validation reducing errors by **95%**
- **<2% of bookings** require manual intervention
- **30 minutes daily** admin time for booking management
- Complete audit trail for compliance

#### Success Measurement KPIs

| Metric | Target | Description |
|--------|--------|-------------|
| **Booking Success Rate** | 95% | First-attempt success rate |
| **Time to Book** | <3 minutes | Average completion time per booking |
| **System Uptime** | 99.9% | Availability during business hours |
| **Admin Efficiency** | 75% reduction | Reduction in manual booking tasks |
| **Cost Savings** | $5,400/year | Elimination of external tool costs |
| **User Satisfaction** | >4.5/5 stars | Student rating of booking experience |
| **Error Rate** | <2% | Bookings requiring correction |
| **Credit Accuracy** | 100% | Accurate credit deductions |

---

## Examples & Patterns

### Similar Features
### Code Examples

**hooks/useBookingFlow.js**
```javascript
// hooks/useBookingFlow.js
import { useState, useCallback } from 'react';

const useBookingFlow = (initialMockExamId) => {
  const [step, setStep] = useState('verify'); // 'verify' | 'details' | 'confirming' | 'confirmed'
  const [bookingData, setBookingData] = useState({
    mockExamId: initialMockExamId,
    studentId: '',
    email: '',
    name: '',
    dominantHand: true,
    credits: null,
    contactId: null
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const verifyCredits = useCallback(async (studentId, email) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/mock-exams/validate-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, email, mockType: bookingData.mockType })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Verification failed');
      }

      setBookingData(prev => ({
        ...prev,
        studentId,
        email,
        credits: result.data.availableCredits,
        contactId: result.data.contactId
      }));
      
      setStep('details');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [bookingData.mockType]);

  const submitBooking = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStep('confirming');

    try {
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Booking failed');
      }

      setBookingData(prev => ({
        ...prev,
        bookingId: result.data.bookingId
      }));
      
      setStep('confirmed');
      return result.data;
      
    } catch (err) {
      setError(err.message);
      setStep('details'); // Go back to details on error
    } finally {
      setLoading(false);
    }
  }, [bookingData]);

  return {
    step,
    bookingData,
    error,
    loading,
    verifyCredits,
    submitBooking,
    setBookingData,
    resetFlow: () => {
      setStep('verify');
      setError(null);
      setBookingData({ mockExamId: initialMockExamId });
    }
  };
};
```
**Hubspot API Call helper**
```javascript
async function hubspotApiCall(method, url, data = null, attempt = 1) {
  const MAX_RETRIES = 3;
  try {
    const response = await axios({
      method,
      url,
      data,
      headers: {
        Authorization: `Bearer ${HUBSPOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      console.warn(`Attempt ${attempt} failed: ${err.message}. Retrying...`);
      await new Promise((res) => setTimeout(res, attempt * 1000));
      return hubspotApiCall(method, url, data, attempt + 1);
    }
    throw err;
  }
}
```

**Sample Search Function**
```javascript
async function getDealName(dealName) {
  const searchDealUrl = `https://api.hubapi.com/crm/v3/objects/${dealObjType}/search`;
  const searchDealPayload = {
            filterGroups: [{
                filters: [{
                    propertyName: 'dealname',
                    operator: 'EQ',
                    value: dealName
                }]
            }],
            limit: 1
    };
}
```

**Sample Retrieve Associations Function**
```javascript
async function getAssocContact(dealId) {
    const contactAssocUrl = `https://api.hubapi.com/crm/v4/objects/${dealObjType}/${dealId}/associations/${contactObjType}`;
    const contactAssociationsResult = await hubspotApiCall('get', contactAssocUrl);
    const contactAssociations = contactAssociationsResult.results;

    let primaryContactId = null;


    if (contactAssociations && contactAssociations.length > 0) {
      primaryContactId = contactAssociations[0].toObjectId;
      console.log(`Found associated Contact ID: ${primaryContactId}`);
      return primaryContactId
    } else {
      console.warn('⚠️ No associated contacts found for this deal.');
    }
}
```

**Sample Get Object Function**
```javascript
async function retrieveSingleLineItems(lineItemId) {
  const properties = ['name', 'createdate', 'course_start_date', 'course_end_date', 'price', 'quantity', 'amount', 'hs_tax_amount']; 
  const query = `?properties=${encodeURIComponent(properties.join(','))}`;
  const url = `https://api.hubapi.com/crm/v3/objects/line_items/${lineItemId}${query}`;
  const resp = await hubspotApiCall('get', url);
  console.log(resp)
  const lineItem = {
        id: lineItemId,
        createdDate: resp.properties.createdate.split('T')[0] || null,
        startDate: resp.properties.course_start_date.split('T')[0] || null,
        endDate: resp.properties.course_end_date.split('T')[0] || null,
        name: resp.properties.name,
        qty: resp.properties.quantity,
        amt: resp.properties.amount,
        price: resp.properties.price,
        tax: resp.properties.hs_tax_amount
  }
  return lineItem;
}

```

### References
- **Design Reference**: (https://www.figma.com/community/file/1364985094118351559/calendly-embed)
- **Hubspot Contacts API Guide**: (https://developers.hubspot.com/docs/api-reference/crm-contacts-v3/guide)
- **Hubspot Associations API Guide**: (https://developers.hubspot.com/docs/api-reference/crm-associations-v4/guide)
- **Hubspot Custom Objects API Guide**: (https://developers.hubspot.com/docs/api-reference/crm-custom-objects-v3/guide)
- **Vercel Using the REST API**: (https://vercel.com/docs/rest-api/reference)
- **Vercel Deployment**: (https://vercel.com/docs/deployments#vercel-cli)
- **Vercel MCP**: (https://vercel.com/docs/mcp/vercel-mcp)
- **Vercel Vite**: (https://vercel.com/docs/frameworks/frontend/vite)
- **Vercel React**: (https://vercel.com/docs/frameworks/frontend/create-react-app)
- **Vercel Express**: (https://vercel.com/docs/frameworks/backend/express)
---

## Dependencies & Constraints

### Framework Dependencies
- **Agent Coordination**: AGENT_DEVELOPER_COORDINATION_RULES.md
- **HubSpot Schema**: documentation\HUBSPOT_SCHEMA_DOCUMENTATION.md
- **Vercel Functions**: CLAUDE.md
---

**Author**: Harmon Tuazon
**Framework Version**: 1.0.0
**Status**: Ready for PRD