# Updated HubSpot Schema Documentation
Generated from live HubSpot instance on: 2025-09-16T18:25:33.609Z

## Object Summary

| Object | Type ID | Total Properties | Status |
|--------|---------|------------------|--------|
| contacts | 0-1 | 768 | ✅ Active |
| deals | 0-3 | 601 | ✅ Active |
| courses | 0-410 | 70 | ✅ Active |
| transactions | 2-47045790 | 59 | ✅ Active |
| payment_schedules | 2-47381547 | 57 | ✅ Active |
| credit_notes | 2-41609496 | 54 | ✅ Active |
| campus_venues | 2-41607847 | 37 | ✅ Active |
| enrollments | 2-41701559 | 86 | ✅ Active |
| lab_stations | 2-41603799 | 51 | ✅ Active |
| bookings | 2-50158943 | 31 | ✅ Active |
| mock_exams | 2-50158913 | 33 | ✅ Active |

---

### CONTACTS Object (0-1)

**Total Properties**: 768
**Business-Relevant Properties**: 20

#### Key Properties

| Property | Type | Label | Required | Description |
|----------|------|-------|----------|-------------|
| `abandoned_cart_counter` | number | Abandoned Cart Counter | No |  |
| `abandoned_cart_date` | date | Abandoned Cart Date | No |  |
| `abandoned_cart_products` | string | Abandoned Cart Products | No |  |
| `abandoned_cart_products_categories` | string | Abandoned Cart Products Categories | No |  |
| `abandoned_cart_products_html` | string | Abandoned Cart Products HTML | No |  |
| `abandoned_cart_products_skus` | string | Abandoned Cart Products SKUs | No |  |
| `abandoned_cart_recovery_workflow_conversion` | enumeration | Abandoned Cart Recovery Workflow Conversion | No |  |
| `abandoned_cart_recovery_workflow_conversion_amount` | number | Abandoned Cart Recovery Workflow Conversion Amount | No |  |
| `abandoned_cart_recovery_workflow_conversion_date` | date | Abandoned Cart Recovery Workflow Conversion Date | No |  |
| `abandoned_cart_recovery_workflow_start_date` | date | Abandoned Cart Recovery Workflow Start Date | No |  |
| `abandoned_cart_subtotal` | number | Abandoned Cart Subtotal | No |  |
| `abandoned_cart_tax_value` | number | Abandoned Cart Tax Value | No |  |
| `abandoned_cart_total_value` | number | Abandoned Cart Total Value | No |  |
| `abandoned_cart_url` | string | Abandoned Cart URL | No |  |
| `access_card_expiry_date` | date | Access Card Expiry Date | No |  |
| `access_card_number` | string | Access Card Number | No |  |
| `access_card_status` | enumeration | Access Card Status | No |  |
| `account_creation_date` | date | Account Creation Date | No |  |
| `acj_books` | enumeration | ACJ Books | No |  |
| `acj_books_status` | enumeration | ACJ Books Status | No |  |

---

### DEALS Object (0-3)

**Total Properties**: 601
**Business-Relevant Properties**: 20

#### Key Properties

| Property | Type | Label | Required | Description |
|----------|------|-------|----------|-------------|
| `adjustment_amount` | number | Adjustment Amount | No | The amount being adjusted to the Closed Deal. |
| `adjustment_date` | datetime | Adjustment Date | No | The date the adjustment was processed. |
| `adjustment_reason` | string | Adjustment Reason | No | A detailed reason for the adjustment. |
| `adjustment_type` | enumeration | Adjustment Type | No | The type of Financial Adjustment
Options: Credit,  |
| `agreement_ip_address` | string | Agreement IP Address | No |  |
| `agreement_signature` | string | Agreement Signature | No |  |
| `agreement_timestamp` | datetime | Agreement Timestamp | No |  |
| `agreement_to_auto_charge` | enumeration | Agreement to Auto-Charge | No |  |
| `agreement_typed_name` | string | Agreement Typed Name | No |  |
| `allow_partial_payments` | enumeration | Allow Partial Payments - Only if needed | No | Allow Partial Payments—This option is available if |
| `amount` | number | Amount | No | The total amount of the deal |
| `amount_collected` | number | Amount Collected | No |  |
| `amount_collected_rate` | number | Amount Collected Rate | No |  |
| `amount_in_home_currency` | number | Amount in company currency | No | The amount of the deal, using the exchange rate, i |
| `approval_required` | enumeration | Approval Required? | No | This field is used to send the deal to a manager t |
| `approval_status` | enumeration | Adjustment Approval Status | No | Status of adjustment approval workflow |
| `approval_threshold_exceeded` | enumeration | Approval Threshold Exceeded | No | Indicates if adjustment exceeds approval threshold |
| `ar_aging_bucket` | string | AR Aging Bucket | No | This property will categorize your open invoices i |
| `billing_person_email` | string | billing_person_email | No |  |
| `billing_person_name` | string | billing_person_name | No |  |

---

### COURSES Object (0-410)

**Total Properties**: 70
**Business-Relevant Properties**: 20

#### Key Properties

| Property | Type | Label | Required | Description |
|----------|------|-------|----------|-------------|
| `books___shipping` | enumeration | Has Books | No |  |
| `course_delivery_method` | enumeration | Course Delivery Method | No |  |
| `course_end_date` | date | Course End Date | No | the End date of the course |
| `course_fee` | number | Course Fee | No | The price of the course |
| `course_start_date` | date | Course Start Date | No | the start date of the course |
| `course_type` | enumeration | Course Type | No |  |
| `course_type_finance` | enumeration | Course Type Finance | No |  |
| `currency` | enumeration | Currency | No |  |
| `has_books__cloned_` | enumeration | Books Format | No |  |
| `has_lab` | enumeration | Has Lab | No | Does this Course have Lab Time? |
| `journey_stage` | string | Journey Stage | No | The associated stage of the course. |
| `lab_days_of_the_week` | enumeration | Lab Days of the Week | No | The days that lab time is assigned to this course |
| `lab_session` | enumeration | Lab Session | No | the Session of the Lab.
Example: Morning or Aftern |
| `lab_session_end_time` | datetime | Lab End Time | No | the time the lab session Ends |
| `lab_session_start_time` | datetime | Lab Start Time | No | the time the lab session starts |
| `licensing_journey` | enumeration | Licensing Journey | No |  |
| `location` | enumeration | Location | No |  |
| `needs_lms` | enumeration | Needs LMS | No |  |
| `needs_shipment_tracking` | enumeration | Needs Shipment Tracking | No |  |
| `needs_vitrium` | enumeration | Needs Vitrium | No |  |

---

### TRANSACTIONS Object (2-47045790)

**Total Properties**: 59
**Business-Relevant Properties**: 20

#### Key Properties

| Property | Type | Label | Required | Description |
|----------|------|-------|----------|-------------|
| `associated_contact_id` | string | Associated Contact ID | No | ID of the contact who made this transaction |
| `associated_credit_note_id` | string | Associated Credit Note ID | No |  |
| `associated_deal_id` | string | Associated Deal ID | No |  |
| `contact_email` | string | Contact Email | No | Email of the contact associated with this transact |
| `contact_id` | string | Contact ID | No | ID of the contact associated with this transaction |
| `contact_name` | string | Contact Name | No | Name of the contact associated with this transacti |
| `correlation_id` | string | Correlation ID | No | Unique ID for tracking related operations and debu |
| `currency` | enumeration | Currency | No | Transaction currency |
| `currency_code` | string | Currency Code | No | Currency code for the transaction (e.g., CAD, USD) |
| `description` | string | Description | No | Transaction description |
| `description_reason` | string | Description/Reason | No | For your team to add manual notes, especially for  |
| `idempotency_key` | string | Idempotency Key | No | Unique key to prevent duplicate transactions |
| `net_amount` | number | Net Amount | No | Stores the net amount you received after the Strip |
| `organization` | enumeration | Organization | No |  |
| `payment_method` | string | Payment Method | No | Stores the details of the payment method used (e.g |
| `payment_status` | enumeration | Payment Status | No | Status of the payment transaction |
| `processing_fee` | number | Processing Fee | No | Stores the fee that Stripe charged for the transac |
| `processing_status` | string | Processing Status | No | Status of transaction processing (Completed, Proce |
| `ps_record_id` | string | Payment Schedule Record ID | No | Links this transaction to a specific payment sched |
| `reference_number` | string | Reference Number | No |  |

---

### PAYMENT_SCHEDULES Object (2-47381547)

**Total Properties**: 57
**Business-Relevant Properties**: 20

#### Key Properties

| Property | Type | Label | Required | Description |
|----------|------|-------|----------|-------------|
| `admin_notes` | string | Admin Notes | No | Internal notes about this payment installment |
| `agreement_to_auto_charge` | enumeration | Agreement to Auto-Charge | No |  |
| `associated_deal_id` | number | Associated Deal ID | No |  |
| `auto_charge_enabled` | enumeration | Auto-Charge Enabled | No | Whether this installment should be automatically c |
| `charge_attempt_id` | string | Charge Attempt ID | No | Stripe payment intent ID for the charge attempt |
| `confirmed_sale` | bool | Confirmed Sale | No |  |
| `contact_record_id` | number | contact record id | No |  |
| `due_date` | date | Due Date | No |  |
| `error_code` | string | Error Code | No | Error code from payment processor or system |
| `error_message` | string | Error Message | No | Detailed error message from payment processing att |
| `failure_reason` | string | Failure Reason | No | Detailed reason why the payment failed (from Strip |
| `installment_amount` | number | Installment Amount | No |  |
| `installment_name` | string | Installment Name | No |  |
| `last_payment_attempt` | datetime | Last Payment Attempt | No | Timestamp of the most recent payment processing at |
| `last_payment_attempt_date` | datetime | last payment attempt date | No |  |
| `last_payment_attempt_status` | string | last_payment_attempt_status | No |  |
| `last_retry_date` | datetime | Last Retry Date | No | Last retry attempt timestamp |
| `last_updated` | datetime | Last Updated | No | Timestamp of the last update to this payment sched |
| `next_retry_date` | datetime | Next Retry Date | No | When the next payment retry attempt is scheduled |
| `notification_sent` | enumeration | Payment Reminder Sent | No | Whether a payment reminder has been sent to the cu |

---

### CREDIT_NOTES Object (2-41609496)

**Total Properties**: 54
**Business-Relevant Properties**: 20

#### Key Properties

| Property | Type | Label | Required | Description |
|----------|------|-------|----------|-------------|
| `applied_history` | string | applied_history | No |  |
| `approver_notes` | string | Approver Notes | No |  |
| `associated_deal_id` | number | associated deal id | No |  |
| `created_date___zoho` | date | Created Date - Zoho | No |  |
| `credit_amount` | number | Credit Amount | No |  |
| `credit_balance` | number | Credit Balance | No |  |
| `credit_note_name` | string | Credit Note Name | No |  |
| `credit_note_status` | enumeration | Credit Note Status | No |  |
| `credit_total` | number | Credit Total | No |  |
| `creditnotes_id___zoho` | number | CreditNotes ID - Zoho | No |  |
| `credits_subtotal` | number | Credits SubTotal | No |  |
| `currency` | enumeration | Currency | No |  |
| `currency_code` | enumeration | Currency Code | No |  |
| `customerpayment_id___zoho` | number | CustomerPayment ID - Zoho | No |  |
| `deal_record_id` | string | Deal Record ID | No |  |
| `expiration_date` | date | Expiration Date | No | Expiration Date, usually 1 year after the creation |
| `last_applied_date` | date | last applied date | No |  |
| `note` | string | Note | No |  |
| `organization` | enumeration | Organization | No |  |
| `reference_number` | string | Reference Number | No |  |

---

### CAMPUS_VENUES Object (2-41607847)

**Total Properties**: 37
**Business-Relevant Properties**: 7

#### Key Properties

| Property | Type | Label | Required | Description |
|----------|------|-------|----------|-------------|
| `afternoon_lab_session_availability` | number | Afternoon Lab Session Availability | No | How many stations are available for the Afternoon  |
| `campus` | enumeration | Campus | No |  |
| `morning_lab_session_availability` | number | Morning Lab Session Availability | No | How many stations are available for the Morning se |
| `organization` | enumeration | Organization | No |  |
| `total_capacity` | number | Total Capacity | No |  |
| `venue_name` | string | Venue Name | No |  |
| `venue_type` | enumeration | Venue Type | No |  |

---

### ENROLLMENTS Object (2-41701559)

**Total Properties**: 86
**Business-Relevant Properties**: 20

#### Key Properties

| Property | Type | Label | Required | Description |
|----------|------|-------|----------|-------------|
| `associated_line_item_id` | string | Associated Line Item ID | No |  |
| `contact_record_id` | string | Contact Record ID | No | The record ID of the contact that created this enr |
| `course_end_date` | date | Course End Date | No | This is the course end date based on Line Item |
| `course_id` | string | Course ID | No |  |
| `course_name` | string | Course Name | No |  |
| `course_record_id` | string | Course Record ID | No | the record id of the course that created this enro |
| `course_start_date` | date | Course Start Date | No | This is the start date that is based on Line Items |
| `deal_name` | string | Deal Name | No |  |
| `deal_record_id` | string | Deal Record ID | No | the record id of the deal that created this enroll |
| `deal_stage` | enumeration | Deal Stage | No |  |
| `email` | string | Email | No |  |
| `enrollment_id` | string | Enrollment ID | No |  |
| `enrollment_record_id` | string | Enrollment Record ID | No |  |
| `enrollment_status` | enumeration | Enrollment Status | No | Tracks the current stage of enrollment: e.g. “Regi |
| `first_name` | string | First Name | No |  |
| `has_lab` | enumeration | Has Lab | No |  |
| `lab_session` | enumeration | Lab Session | No |  |
| `last_name` | string | Last Name | No |  |
| `location` | enumeration | Location | No |  |
| `needs_lms` | enumeration | Needs LMS | No |  |

---

### LAB_STATIONS Object (2-41603799)

**Total Properties**: 51
**Business-Relevant Properties**: 20

#### Key Properties

| Property | Type | Label | Required | Description |
|----------|------|-------|----------|-------------|
| `afternoon_availability_status` | enumeration | Afternoon Availability Status | No |  |
| `afternoon_session_end_date_and_time` | datetime | Afternoon Session End Date and Time | No |  |
| `afternoon_session_start_date_and_time` | datetime | Afternoon Session Start Date and Time | No |  |
| `campus_location` | enumeration | Campus Location | No |  |
| `enrollment_association_count` | number | Enrollment Association Count | No |  |
| `future_afternoon_availability_status` | enumeration | Future Afternoon Availability Status | No |  |
| `future_afternoon_session_end_date_and_time` | datetime | Future Afternoon Session End Date and Time | No |  |
| `future_afternoon_session_start_date_and_time` | datetime | Future Afternoon Session Start Date and Time | No |  |
| `future_morning__availability_status` | enumeration | Future Morning  Availability Status | No |  |
| `future_morning_session_end_date_and_time` | datetime | Future Morning Session End Date and Time | No |  |
| `future_morning_session_start_date_and_time` | datetime | Future Morning Session Start Date and Time | No |  |
| `lab` | string | Lab | No |  |
| `lab_name` | enumeration | Lab Name | No |  |
| `lab_station` | string | Lab Station | No |  |
| `morning_availability_status` | enumeration | Morning Availability Status | No |  |
| `morning_session_end_date_and_time` | datetime | Morning Session End Date and Time | No |  |
| `morning_session_start_date_and_time` | datetime | Morning Session Start Date and Time | No |  |
| `organization` | enumeration | Organization | No |  |
| `station_number` | number | Station Number | No |  |
| `station_type` | enumeration | Station Type | No |  |

---

### BOOKINGS Object (2-50158943)

**Total Properties**: 31
**Business-Relevant Properties**: 1

#### Key Properties

| Property | Type | Label | Required | Description |
|----------|------|-------|----------|-------------|
| `booking_id` | string | Booking ID | No |  |

---

### MOCK_EXAMS Object (2-50158913)

**Total Properties**: 33
**Business-Relevant Properties**: 3

#### Key Properties

| Property | Type | Label | Required | Description |
|----------|------|-------|----------|-------------|
| `capacity` | number | Capacity | No |  |
| `exam_date` | date | Exam Date | No |  |
| `mock_exam_id` | number | Mock Exam ID | No |  |

---

