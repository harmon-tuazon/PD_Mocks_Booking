require('dotenv').config();
const { HubSpotService, HUBSPOT_OBJECTS } = require('../_shared/hubspot');
const {
  setCorsHeaders,
  handleOptionsRequest,
  createErrorResponse,
  createSuccessResponse,
  verifyEnvironmentVariables
} = require('../_shared/auth');
const crypto = require('crypto');

/**
 * Verify HubSpot webhook signature
 */
function verifyWebhookSignature(req) {
  const signature = req.headers['x-hubspot-signature-v3'];
  const timestamp = req.headers['x-request-timestamp'];
  const clientSecret = process.env.HUBSPOT_WEBHOOK_SECRET;

  if (!signature || !timestamp || !clientSecret) {
    console.error('Missing signature, timestamp, or client secret');
    return false;
  }

  // Check timestamp to prevent replay attacks (within 5 minutes)
  const currentTime = Date.now();
  const requestTime = parseInt(timestamp);
  if (Math.abs(currentTime - requestTime) > 300000) { // 5 minutes
    console.error('Webhook timestamp too old');
    return false;
  }

  // Construct the source string
  const method = req.method;
  const uri = `https://${req.headers.host}${req.url}`;
  const body = JSON.stringify(req.body);
  const sourceString = method + uri + body + timestamp;

  // Calculate expected signature
  const hash = crypto.createHmac('sha256', clientSecret)
    .update(sourceString)
    .digest('base64');

  const expectedSignature = `v3=${hash}`;

  return signature === expectedSignature;
}

/**
 * Extract mock exam IDs from webhook payload
 */
async function extractMockExamIds(events, hubspot) {
  const mockExamIds = new Set();

  for (const event of events) {
    if (event.subscriptionType === 'contact.associationChange' ||
        event.subscriptionType === 'contact.deletion' ||
        event.subscriptionType === 'contact.propertyChange') {

      const objectId = event.objectId;

      try {
        // Get associations for this booking to find related mock exams
        const associations = await hubspot.apiCall(
          'GET',
          `/crm/v4/objects/${HUBSPOT_OBJECTS.bookings}/${objectId}/associations/${HUBSPOT_OBJECTS.mock_exams}`
        );

        if (associations?.results) {
          associations.results.forEach(assoc => {
            mockExamIds.add(assoc.toObjectId);
          });
        }
      } catch (error) {
        // If booking is deleted, we might not be able to get associations
        // In this case, we'll need to sync all active mock exams
        console.error(`Could not get associations for booking ${objectId}:`, error.message);
      }
    }
  }

  return Array.from(mockExamIds);
}

/**
 * POST /api/webhooks/booking-sync
 * Handle HubSpot webhook events for booking changes (creation/deletion/updates)
 * This webhook automatically recalculates mock exam capacities when bookings change
 */
module.exports = async (req, res) => {
  // Set CORS headers
  setCorsHeaders(res);

  // Handle OPTIONS request
  if (handleOptionsRequest(req, res)) {
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json(
      createErrorResponse(new Error('Method not allowed'))
    );
  }

  try {
    // Verify environment variables
    verifyEnvironmentVariables();

    // Verify webhook signature if in production
    if (process.env.NODE_ENV === 'production' && process.env.HUBSPOT_WEBHOOK_SECRET) {
      if (!verifyWebhookSignature(req)) {
        console.error('Invalid webhook signature');
        return res.status(401).json(
          createErrorResponse(new Error('Unauthorized'))
        );
      }
    }

    const events = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      console.log('No events to process');
      return res.status(200).json(createSuccessResponse({
        processed: 0,
        message: 'No events to process'
      }));
    }

    console.log(`Processing ${events.length} webhook events`);

    // Initialize HubSpot service
    const hubspot = new HubSpotService();

    // Extract unique mock exam IDs that need capacity recalculation
    const mockExamIds = await extractMockExamIds(events, hubspot);

    if (mockExamIds.length === 0) {
      console.log('No mock exams need capacity updates');
      return res.status(200).json(createSuccessResponse({
        processed: events.length,
        updatedExams: 0,
        message: 'No mock exams needed updates'
      }));
    }

    console.log(`Recalculating capacity for ${mockExamIds.length} mock exams`);

    // Recalculate capacity for each affected mock exam
    const updateResults = await Promise.allSettled(
      mockExamIds.map(examId => hubspot.recalculateMockExamBookings(examId))
    );

    // Count successful updates
    const successfulUpdates = updateResults.filter(result => result.status === 'fulfilled').length;
    const failedUpdates = updateResults.filter(result => result.status === 'rejected').length;

    // Log any failures
    updateResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to update mock exam ${mockExamIds[index]}:`, result.reason);
      }
    });

    const response = {
      processed: events.length,
      updatedExams: successfulUpdates,
      failedUpdates,
      message: `Processed ${events.length} events, updated ${successfulUpdates} mock exams`
    };

    console.log('Webhook processing complete:', response);

    // Return success even if some updates failed
    // This prevents HubSpot from retrying the webhook unnecessarily
    res.status(200).json(createSuccessResponse(response));

  } catch (error) {
    console.error('Error processing webhook:', error);

    // Return 200 to prevent webhook retries for permanent errors
    // Only return error status for temporary/retriable errors
    if (error.message?.includes('rate limit')) {
      return res.status(429).json(createErrorResponse(error));
    }

    // Log the error but return success to prevent webhook spam
    console.error('Webhook error (returning 200 to prevent retries):', error);
    res.status(200).json(createSuccessResponse({
      processed: 0,
      error: 'Error processed, check logs',
      message: error.message
    }));
  }
};