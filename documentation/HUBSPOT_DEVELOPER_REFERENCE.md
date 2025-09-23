# HubSpot Developer Reference
## Latest API Documentation & Best Practices

### Table of Contents
1. [Timeline Events API](#timeline-events-api)
2. [Engagements & Notes API](#engagements--notes-api)
3. [Custom Objects & Properties](#custom-objects--properties)
4. [Batch Operations](#batch-operations)
5. [Search API](#search-api)
6. [Associations](#associations)
7. [Webhooks](#webhooks)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)
10. [Code Examples](#code-examples)

---

## Timeline Events API

### Overview
The Timeline Events API allows you to create custom events that appear in the timeline of CRM records. This is perfect for tracking financial operations, charge attempts, and processing history.

### Creating Timeline Event Templates
```javascript
// First, create an event template (one-time setup)
const eventTemplate = await hubspotClient.crm.timeline.eventTemplatesApi.create(
  appId,
  {
    name: "Payment Processing Event",
    objectType: "deals",
    headerTemplate: "Payment {{#if success}}succeeded{{else}}failed{{/if}}",
    detailTemplate: "Amount: ${{amount}} | Status: {{status}}",
    tokens: [
      { name: "amount", label: "Amount", type: "string" },
      { name: "status", label: "Status", type: "string" },
      { name: "success", label: "Success", type: "boolean" }
    ]
  }
);
```

### Creating Timeline Events
```javascript
// Create an event instance
await hubspotClient.crm.timeline.eventsApi.create({
  eventTemplateId: "your_template_id",
  objectId: dealId,
  tokens: {
    amount: "625.00",
    status: "succeeded",
    success: true
  },
  timestamp: Date.now()
});
```

### Batch Timeline Events
```javascript
// Create multiple events at once
await hubspotClient.crm.timeline.eventsApi.createBatch({
  events: [
    {
      eventTemplateId: templateId,
      objectId: dealId1,
      tokens: { amount: "500", status: "pending" }
    },
    {
      eventTemplateId: templateId,
      objectId: dealId2,
      tokens: { amount: "750", status: "completed" }
    }
  ]
});
```

---

## Engagements & Notes API

### Creating Notes on Deals
```javascript
// Modern approach using CRM v3 API
async function createDealNote(dealId, noteContent) {
  const note = await hubspotClient.crm.objects.notes.basicApi.create({
    properties: {
      hs_note_body: noteContent,
      hs_timestamp: Date.now()
    },
    associations: [
      {
        to: { id: dealId },
        types: [
          {
            associationCategory: "HUBSPOT_DEFINED",
            associationTypeId: 214 // Note to Deal association
          }
        ]
      }
    ]
  });
  return note;
}
```

### Creating Rich HTML Notes
```javascript
// Create formatted notes with HTML
const richNote = `
  <h3>🔄 Charge Processing Report</h3>
  <table style="border-collapse: collapse; width: 100%;">
    <tr>
      <td><strong>Status:</strong></td>
      <td style="color: green;">✅ Success</td>
    </tr>
    <tr>
      <td><strong>Amount:</strong></td>
      <td>$625.00</td>
    </tr>
    <tr>
      <td><strong>Stripe ID:</strong></td>
      <td>pi_3O8x2KLt...</td>
    </tr>
  </table>
  <details>
    <summary>Technical Details</summary>
    <pre>${JSON.stringify(processingDetails, null, 2)}</pre>
  </details>
`;

await createDealNote(dealId, richNote);
```

### Creating Tasks
```javascript
// Create a task for follow-up
const task = await hubspotClient.crm.objects.tasks.basicApi.create({
  properties: {
    hs_task_subject: "Review failed payment",
    hs_task_body: "Payment failed for installment 2. Review and retry.",
    hs_task_status: "NOT_STARTED",
    hs_task_priority: "HIGH",
    hs_due_date: new Date(Date.now() + 24*60*60*1000).toISOString()
  },
  associations: [
    {
      to: { id: dealId },
      types: [
        {
          associationCategory: "HUBSPOT_DEFINED",
          associationTypeId: 216 // Task to Deal association
        }
      ]
    }
  ]
});
```

---

## Custom Objects & Properties

### Extending Custom Objects with Properties
```javascript
// Add new property to Payment Schedule object
async function addCustomProperty(objectTypeId, propertyData) {
  const property = await hubspotClient.crm.properties.coreApi.create(
    objectTypeId,
    {
      name: "retry_attempts",
      label: "Retry Attempts",
      type: "number",
      fieldType: "number",
      groupName: "payment_tracking"
    }
  );
  return property;
}

// Enumeration property example
const statusProperty = {
  name: "processing_status",
  label: "Processing Status",
  type: "enumeration",
  fieldType: "select",
  options: [
    { label: "Pending", value: "pending" },
    { label: "Processing", value: "processing" },
    { label: "Succeeded", value: "succeeded" },
    { label: "Failed", value: "failed" },
    { label: "Retrying", value: "retrying" }
  ]
};
```

### Updating Custom Object Records
```javascript
// Update Payment Schedule record
await hubspotClient.crm.objects.basicApi.update(
  process.env.HS_PAYMENT_SCHEDULE_OBJECT_TYPE_ID,
  scheduleId,
  {
    properties: {
      status: "Paid",
      stripe_payment_id: paymentIntentId,
      retry_attempts: retryCount,
      last_retry_date: new Date().toISOString(),
      processing_status: "succeeded"
    }
  }
);
```

---

## Batch Operations

### Batch Read
```javascript
// Read multiple records at once
const batchRead = await hubspotClient.crm.objects.batchApi.read(
  process.env.HS_PAYMENT_SCHEDULE_OBJECT_TYPE_ID,
  {
    inputs: [
      { id: "schedule1" },
      { id: "schedule2" },
      { id: "schedule3" }
    ],
    properties: ["status", "amount", "due_date"]
  }
);
```

### Batch Update
```javascript
// Update multiple Payment Schedules
const batchUpdate = await hubspotClient.crm.objects.batchApi.update(
  process.env.HS_PAYMENT_SCHEDULE_OBJECT_TYPE_ID,
  {
    inputs: schedules.map(schedule => ({
      id: schedule.id,
      properties: {
        processing_status: "processing",
        charge_processor_run_id: runId
      }
    }))
  }
);
```

### Batch Create
```javascript
// Create multiple records
const batchCreate = await hubspotClient.crm.objects.batchApi.create(
  objectTypeId,
  {
    inputs: [
      { properties: { name: "Record 1", amount: 100 } },
      { properties: { name: "Record 2", amount: 200 } }
    ]
  }
);
```

---

## Search API

### Advanced Search with Filters
```javascript
// Search Payment Schedules due today
const searchResults = await hubspotClient.crm.objects.searchApi.doSearch(
  process.env.HS_PAYMENT_SCHEDULE_OBJECT_TYPE_ID,
  {
    filterGroups: [
      {
        filters: [
          {
            propertyName: "due_date",
            operator: "EQ",
            value: new Date().toISOString().split('T')[0]
          },
          {
            propertyName: "status",
            operator: "NEQ",
            value: "Paid"
          }
        ]
      }
    ],
    sorts: [{ propertyName: "due_date", direction: "ASCENDING" }],
    properties: ["all_properties"],
    limit: 100,
    after: 0
  }
);
```

### Complex Search with OR Logic
```javascript
// Find schedules that need processing OR retry
const complexSearch = {
  filterGroups: [
    {
      filters: [
        { propertyName: "status", operator: "EQ", value: "Scheduled" },
        { propertyName: "due_date", operator: "LTE", value: today }
      ]
    },
    {
      filters: [
        { propertyName: "processing_status", operator: "EQ", value: "retrying" },
        { propertyName: "next_retry_date", operator: "LTE", value: now }
      ]
    }
  ],
  limit: 50
};
```

---

## Associations

### Creating Associations
```javascript
// Associate Payment Schedule with Deal
await hubspotClient.crm.associations.v4.basicApi.create(
  process.env.HS_PAYMENT_SCHEDULE_OBJECT_TYPE_ID,
  scheduleId,
  "deals",
  dealId,
  [
    {
      associationCategory: "USER_DEFINED",
      associationTypeId: customAssociationTypeId
    }
  ]
);
```

### Batch Associations
```javascript
// Associate multiple records at once
await hubspotClient.crm.associations.batchApi.create(
  fromObjectType,
  toObjectType,
  {
    inputs: [
      {
        from: { id: "record1" },
        to: { id: "deal1" },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 123 }]
      },
      {
        from: { id: "record2" },
        to: { id: "deal2" },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 123 }]
      }
    ]
  }
);
```

---

## Webhooks

### Webhook Event Structure
```json
{
  "objectId": 1246965,
  "propertyName": "status",
  "propertyValue": "Paid",
  "changeSource": "API",
  "eventId": 3816279340,
  "subscriptionId": 25,
  "portalId": 33,
  "occurredAt": 1462216307945,
  "eventType": "propertyChange",
  "attemptNumber": 0
}
```

### Handling Webhook Events
```javascript
app.post('/webhook', (req, res) => {
  const events = req.body;
  
  events.forEach(async (event) => {
    if (event.eventType === 'propertyChange' && 
        event.propertyName === 'status') {
      // Handle status change
      await handleStatusChange(event.objectId, event.propertyValue);
    }
  });
  
  res.status(200).send();
});
```

---

## Error Handling

### Comprehensive Error Handling Pattern
```javascript
async function safeHubSpotOperation(operation, context) {
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Handle rate limiting
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 10;
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      // Handle server errors with exponential backoff
      if (error.response?.status >= 500) {
        const backoffTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        continue;
      }
      
      // Log non-retryable errors
      logger.error('HubSpot operation failed', {
        attempt,
        error: error.message,
        context
      });
      
      // Create error note if dealId provided
      if (context.dealId) {
        await createDealNote(
          context.dealId,
          `❌ Operation Failed: ${context.operation}\\n${error.message}`
        );
      }
      
      throw error;
    }
  }
  
  throw lastError;
}
```

---

## Rate Limiting

### Client Configuration with Rate Limiting
```javascript
const hubspotClient = new Client({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
  numberOfApiCallRetries: 3,
  limiterOptions: {
    minTime: 1000 / 9,  // 9 calls per second
    maxConcurrent: 6,    // 6 concurrent requests
    id: 'hubspot-client-limiter'
  }
});

// Search-specific rate limiting
const SEARCH_LIMITER_OPTIONS = {
  minTime: 550,        // Slower for search operations
  maxConcurrent: 3,
  id: 'search-hubspot-client-limiter'
};
```

---

## Code Examples

### Complete Charge Processing Example
```javascript
async function processPaymentSchedule(schedule) {
  const dealId = schedule.properties.associated_deal_id;
  const amount = schedule.properties.installment_amount;
  
  try {
    // 1. Update status to processing
    await hubspotClient.crm.objects.basicApi.update(
      process.env.HS_PAYMENT_SCHEDULE_OBJECT_TYPE_ID,
      schedule.id,
      { properties: { processing_status: "processing" } }
    );
    
    // 2. Process payment via Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100,
      currency: 'usd',
      customer: schedule.properties.stripe_customer_id,
      metadata: {
        dealId,
        scheduleId: schedule.id,
        ps_record_id: schedule.properties.ps_record_id
      }
    });
    
    // 3. Confirm payment
    const result = await stripe.paymentIntents.confirm(paymentIntent.id);
    
    // 4. Update Payment Schedule
    await hubspotClient.crm.objects.basicApi.update(
      process.env.HS_PAYMENT_SCHEDULE_OBJECT_TYPE_ID,
      schedule.id,
      {
        properties: {
          status: "Paid",
          processing_status: "succeeded",
          stripe_payment_id: result.id,
          payment_date: new Date().toISOString()
        }
      }
    );
    
    // 5. Create success note
    await createDealNote(dealId, `
      <h3>✅ Payment Processed Successfully</h3>
      <p><strong>Amount:</strong> $${amount}</p>
      <p><strong>Payment ID:</strong> ${result.id}</p>
      <p><strong>Schedule:</strong> ${schedule.properties.installment_name}</p>
    `);
    
    // 6. Create timeline event
    await hubspotClient.crm.timeline.eventsApi.create({
      eventTemplateId: process.env.PAYMENT_SUCCESS_TEMPLATE_ID,
      objectId: dealId,
      tokens: {
        amount: amount.toString(),
        paymentId: result.id,
        scheduleName: schedule.properties.installment_name
      }
    });
    
    return { success: true, paymentId: result.id };
    
  } catch (error) {
    // Handle failure
    await handlePaymentFailure(schedule, error);
    throw error;
  }
}
```

### Retry Management Example
```javascript
async function scheduleRetry(schedule, error) {
  const retryCount = (schedule.properties.retry_attempts || 0) + 1;
  const maxRetries = 3;
  
  if (retryCount > maxRetries) {
    // Mark as abandoned
    await hubspotClient.crm.objects.basicApi.update(
      process.env.HS_PAYMENT_SCHEDULE_OBJECT_TYPE_ID,
      schedule.id,
      {
        properties: {
          processing_status: "abandoned",
          error_message: "Max retries exceeded"
        }
      }
    );
    
    // Create task for manual review
    await createReviewTask(schedule);
    return;
  }
  
  // Calculate next retry time (exponential backoff)
  const delayHours = Math.pow(2, retryCount);
  const nextRetryDate = new Date(Date.now() + delayHours * 60 * 60 * 1000);
  
  // Update schedule with retry info
  await hubspotClient.crm.objects.basicApi.update(
    process.env.HS_PAYMENT_SCHEDULE_OBJECT_TYPE_ID,
    schedule.id,
    {
      properties: {
        processing_status: "retrying",
        retry_attempts: retryCount,
        next_retry_date: nextRetryDate.toISOString(),
        last_retry_date: new Date().toISOString(),
        error_code: error.code || "unknown",
        error_message: error.message
      }
    }
  );
  
  // Log retry scheduled
  await createDealNote(
    schedule.properties.associated_deal_id,
    `🔁 Retry Scheduled (Attempt ${retryCount}/${maxRetries})\\nNext retry: ${nextRetryDate.toLocaleString()}`
  );
}
```

### Pagination Helper
```javascript
async function getAllPaymentSchedules(filterGroups) {
  const allResults = [];
  let after = 0;
  
  while (true) {
    const response = await hubspotClient.crm.objects.searchApi.doSearch(
      process.env.HS_PAYMENT_SCHEDULE_OBJECT_TYPE_ID,
      {
        filterGroups,
        properties: ["all_properties"],
        limit: 100,
        after
      }
    );
    
    allResults.push(...response.results);
    
    if (!response.paging?.next?.after) {
      break;
    }
    
    after = response.paging.next.after;
  }
  
  return allResults;
}
```

---

## Best Practices Summary

1. **Always use batch operations** when dealing with multiple records
2. **Implement idempotency checks** to prevent duplicate processing
3. **Use Timeline Events** for user-visible activities
4. **Use Notes** for detailed logging and audit trails
5. **Handle rate limits gracefully** with exponential backoff
6. **Leverage HubSpot Workflows** for automation instead of custom code
7. **Use associations** to maintain relationships between objects
8. **Implement comprehensive error handling** with fallback logging
9. **Use search API efficiently** with proper filters and pagination
10. **Keep properties organized** in logical groups

---

## Additional Resources

- [HubSpot API Documentation](https://developers.hubspot.com/docs/api/overview)
- [HubSpot Node.js Client Library](https://github.com/hubspot/hubspot-api-nodejs)
- [Timeline Events Guide](https://developers.hubspot.com/docs/api/crm/timeline)
- [Custom Objects Documentation](https://developers.hubspot.com/docs/api/crm/crm-custom-objects)
- [Webhooks Documentation](https://developers.hubspot.com/docs/api/webhooks)

---

*Last Updated: January 2025*
*Based on latest HubSpot API v3 and Timeline Events API*