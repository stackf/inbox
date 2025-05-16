# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash

# yarn
yarn install

```

## Development Server

Start the netlify server on `http://localhost:8888`:

```bash
# netlify cli
netlify dev

```

## About the project
This project aims to manage my gmail inboxes with a OpenAI Assistent.

### Integrations
* Netlify functions - to run cron jobs and have endpoints for tools
* OpenAI Assistent API - to start assistent threads and to (self) update the Assistents system prompts
* GMAIL API - to retrieve emails, add labels, archive, set drafts, etc
* Slack API - to notify the boss, and to chat with the boss to take furthur actions
* Trello API - to add items in the Getting Things Done board of the boss

### Workflows

#### Handle incoming mails in inbox
- Cron job that runs each 15 minutes
The 'Handle-Inbox' (HI) assistent retrieves emails in the inbox, filtered on not having a 'processed by HI'-label
The HI Assistent loops through each email, and decides how to handle them based on these instructions:

* Call 'Archive'-tool (retrieves items in inbox with 'archive-in-x-days'-label, older than x-days and archives them)
* Forward email with invoice-attachements to {my bookkeeping email}, where it gets imported in the bookkeeping system.
* For Newsletters: label as 'to-summarize' & as 'archive-in-3-days'
* For customer emails, new business emails or any other emails that seem important and require a reply from the boss: Notify the boss directly in the Slack Channel, set a 'short and sweet' draft response
* For (system) Notifications: the HI assistent should be able to estimate the notification as 'urgent' or 'important-not-urgent' or 'irrelevant' based on sender and content. Urgent matters require a direct notification in the Slack Channel with an offer to add this as item in the Getting Things Done trello board. 'Important not Urgent' matters should be labeled as 'to-summarize'. Irrelevant should be labeled as 'archive-in-3-days'.

The HI assistent labels each processed email-item with a 'processed by HI'-label


#### Daily report
- Cron job that runs daily at 19:00 (Amsterdam time)
The 'Daily-Report' (DARE) assistent retrieves emails in the inbox filtered on 'to-summarize' from the last 24 hours.
The DARE assistent loops through each email and gives a short summary in HackerNews style:
* For newsletters, it creates a descriptive title and link for each topic. It skips topics of which it estimates the boss does not think is interesting or finds irrelevant.
* For 'urgent' & 'important-not-urgent'-notifications, it too creates a descriptive title and link.
* For 'irrelevant' notifications, it offers a unsubscribe link from the email (if available)

#### Back and forth Chat
- Initiated through Slack by the boss
The daily report and urgent messages from the HI assistent are posted in a slack channel. When the boss replies, the boss starts talking to a CHAT assistent, which has access to the recent history of messages in the slack channel. And it has access to all the same tools as the HI and DARE assistent. On top of that, the CHAT assistent can update the system prompts of all asisstents based on the boss' feedback.
* When the boss gives feedback on a newsletter topic from the daily report, whether the boss finds it interesting or not, the CHAT assistent updates the system prompt (if needed) to improve the DARE assistent.
* The boss can talk deeply with the CHAT assistent about a topic or email. The CHAT assistent can create Trello Items in the boss's Getting Things Done board, for example to draft a LinkedIn post for the boss about the discussed topic. When it is about a reply, the CHAT assistent can update the draft response.
* When the boss says he want to unsubscribe from a certain newsletter, the Chat assistent shares the unsubscribe-link from the email.
* When the boss says he want to act on a certain email, the CHAT assistent creates a trello item in the Getting Things Done board
* When the boss says a certain emails came from a customer, the CHAT assistent updates the system prompts for future reference
* When the boss says a certain notification was mislabels in importancy, the CHAT assistent updates the system prompts for future reference

