# Improvements

This is a description of improvements for Claude Code to implement.

1. ✅ Send to bookkeeper (COMPLETED)
I have created a new tool in the list of functions/tool-call.js:
'gmail_send_to_bookkeeper'
This takes in just a messageId, and calls the function 'sendToBookkeeper'

I already implemented the solution of the sendToBookkeeper function:
- gets the original message including all the attachments of type pdf
- prefer plan-text if available, fallback to html if only that is available
- use @sendgrid/mail sdk to send email with attachments.
- adds sent-to-bookkeeper label

environment variables:
SENDGRID_API_KEY - use this sendgrid api key
SENDGRID_FROM - use this as from address (domain is verified within sendgrid)
BOOKKEEPING_EMAIL - send to this email
GMAIL_LABEL_ID_SENT_TO_BOOKKEEPING - add this label when sent to bookkeeping email

Implementation complete:
- Updated assistant configurations in setup-assistants.js to include the new tool
- Added schema definition for the new tool
- Updated system prompt in documentation/system-prompts/hi.md
- Marked gmail_forward_email as deprecated

2. ✅ Extract unsubscribe tool (COMPLETED)
This is servers the use case where the assistant offers a unsubscribe-link if it decides this is relevant.
However, i think the assistant should get that from the raw body is already parses. So the assistant system prompt should handle this, and we should get rid of the gmail_search_unsubscribe_link function. 

Implementation complete:
- Updated system prompt in documentation/system-prompts/hi.md with detailed instructions on how to extract unsubscribe links directly from email content
- Marked `gmail_search_unsubscribe_link` as deprecated in both tool-call.js and setup-assistants.js
- The assistant will now:
  1. First check the List-Unsubscribe header
  2. Then look for common unsubscribe patterns in HTML content
  3. Include found links in Slack notifications
- This approach eliminates an extra API call and leverages existing content already available to the assistant

3. ✅ Automate Email Archiving (COMPLETED)
The assistant previously had to look for emails with `archive-in-3-days` label that were older than 3 days, and manually archive them. This has now been programmatically implemented in the cron job:

Implementation:
- Added direct archiving functionality to `handle-inbox-cron-background.js` to run before the assistant processes emails
- This new function:
  - Looks for emails with the `GMAIL_LABEL_ID_ARCHIVE_IN_3_DAYS` label
  - Finds emails older than 3 days (72 hours)
  - Automatically archives them by removing the INBOX label
- Updated the system prompt to clarify that the assistant only needs to apply the label, not handle archiving
- This approach will:
  - Reduce the number of API calls the assistant needs to make
  - Make archiving more reliable by handling it directly in the code
  - Simplify the assistant's workflow

Required environment variables:
- GMAIL_LABEL_ID_ARCHIVE_IN_3_DAYS - The Gmail label ID for the archive-in-3-days label

Additional changes:
- Completely removed all deprecated tools from all assistant configurations:
  - Removed `archive_old_emails` from Handle-Inbox assistant 
  - Removed `gmail_search_unsubscribe_link` from all assistants
  - Removed `gmail_forward_email` from all assistants
- Marked deprecated functions in tool-call.js and schema definitions in setup-assistants.js
- This ensures the assistants only have access to the current, supported tools

4. 
 