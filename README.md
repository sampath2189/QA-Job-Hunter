# AI-Powered QA Job Hunter

An AI-powered job discovery and matching system built with Node.js, JavaScript, Playwright, Gemini API, and Gmail.

The system scans selected employer career sites, identifies QA/testing-related opportunities, evaluates them against a configurable candidate profile, removes irrelevant roles, prevents duplicate alerts, and sends email notifications for new matching jobs.

## Project Goal

The purpose of this project is to automate the repetitive part of a QA engineer's job search.

Instead of manually checking multiple company career pages every day, the system:

1. Scans employer career pages and career APIs.
2. Collects available job postings.
3. Identifies potential QA/testing roles.
4. Retrieves additional job details when required.
5. Matches jobs against the candidate profile.
6. Filters out irrelevant hardware, manufacturing, and non-software QA roles.
7. Prevents duplicate job alerts.
8. Sends an email notification for new matching opportunities.
9. Stores discovered jobs locally for tracking.

The project is designed around direct employer career sources rather than relying only on third-party job boards.
 
## High-Level Architecture

```text
Candidate Profile + Keywords
            |
            v
     Career Page Scanners
            |
            v
      Job Normalization
            |
            v
        QA Matcher
            |
       +----+----+
       |         |
       v         v
    IGNORE   MATCH/REVIEW
                 |
                 v
             Job Store
                 |
                 v
            Gmail Alert
```

## Email Notifications

Gmail is used for job alerts.

The application uses:

- GMAIL_USER
- GMAIL_APP_PASSWORD

The Gmail App Password is stored only in the local .env file.

The actual secret is not committed to GitHub.

A safe template is provided in .env.example.

## Gemini API

Gemini is included in the project for AI-assisted capabilities.

The API key is provided through the GEMINI_API_KEY environment variable.

The real API key is stored locally in the .env file.

Never commit the .env file to GitHub.

## Technology Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| JavaScript | Application logic |
| Playwright | Browser automation and career-page interaction |
| Gemini API | AI capabilities |
| Gmail | Job notifications |
| JSON | Configuration and local job storage |
| Git | Version control |
| GitHub | Source control and project hosting |

## Environment Setup

Create a local .env file in the project root:

GEMINI_API_KEY=your_gemini_api_key
GMAIL_USER=your_gmail_address
GMAIL_APP_PASSWORD=your_gmail_app_password

The .env file is intentionally excluded from Git. Use .env.example as the template.

## Installation

Clone the repository:

git clone https://github.com/sampath2189/QA-Job-Hunter.git
cd QA-Job-Hunter

Install dependencies:

npm install

Install Playwright Chromium:

npx playwright install chromium

Create the local .env file and add the required credentials.

## Running the Project

The main job discovery pipeline is src/jobPipeline.js.

Run it with:

node src/jobPipeline.js

The pipeline:

1. Scans configured career sources.
2. Collects jobs.
3. Retrieves additional details where required.
4. Normalizes job data.
5. Matches jobs against the candidate profile.
6. Stores matching jobs.
7. Prevents duplicate alerts.
8. Sends Gmail notifications.

## Testing

The repository contains tests for scanners, matching, database handling, and notifications.

Examples:

node tests/job-matcher-test.js

node tests/job-store-test.js

node tests/alert-manager-test.js

node tests/alert-retry-test.js

Individual scanner tests can also be executed directly.

## Career Platform Handling

Different employers use different career technologies. The project therefore does not assume that every company can be scanned using the same strategy.

### Workday

Uses Workday job-list APIs/pages and handles pagination and job-detail extraction. The scanner includes synchronization logic to detect when a new job-list page has actually loaded instead of relying only on arbitrary fixed delays.

### Eightfold

Qualcomm's career system uses Eightfold. The scanner communicates with the career site's search and position-detail endpoints to retrieve structured job information.

### Apple

Apple uses a custom career site, so a dedicated scanner is used for job listing discovery, pagination, job URL extraction, job ID extraction, QA candidate filtering, and job-detail retrieval.

### Custom Career Systems

Amazon and BMC have dedicated scanner implementations because their career systems require company-specific handling.

## Configuration

The project keeps candidate preferences and matching rules outside the main application code.

Candidate profile: config/profile.json

Job keywords: config/keywords.json

Career platform configuration: config/careerPlatforms.json

Company reference list: config/companies.json

This makes the system easier to maintain without modifying core matching logic.

## Current Validation

The project has been tested against multiple real employer career sources.

Recent validation covered:

- Apple
- Amazon
- Adobe
- Motorola Solutions
- NVIDIA
- BMC Software
- BrowserStack
- Qualcomm

The pipeline has successfully demonstrated:

- Multi-company scanning
- Pagination handling
- Job-detail retrieval
- QA candidate filtering
- Match scoring
- Relevance filtering
- Duplicate detection
- Email notification
- Alert retry handling

## Security

Sensitive credentials must never be committed.

Protected values include GEMINI_API_KEY and GMAIL_APP_PASSWORD.

The repository uses .gitignore to exclude .env and node_modules/. A safe environment template is provided in .env.example.

## Current Limitations

Career websites frequently change their HTML structure, APIs, pagination behavior, authentication requirements, anti-bot protections, and URL structure.

Therefore, scanners may require maintenance when employers change their career platforms.

Some career sites may also block automated access or use Cloudflare or other anti-bot protections.

The project intentionally avoids bypassing such protections.

## Future Enhancements

Planned improvements include:

- GitHub Actions scheduled execution
- Once/twice-daily automated scans
- Google Sheets job tracking
- More structured email notifications
- Additional career-platform adapters
- Improved experience extraction
- Improved AI-assisted job relevance analysis
- Historical job analytics
- Application assistance using Playwright
- Human review before final application submission

## Application Assistance Philosophy

Future application automation is intended to assist with repetitive application steps while keeping the candidate in control.

Planned workflow:

Matched Job -> Open Employer Application -> Pre-fill Known Information -> Candidate Reviews -> Candidate Approves -> Final Submission

The system should not blindly submit applications without human review.

## Technical Overview

### Project Overview

I built an AI-powered QA job discovery system that scans employer career sites, identifies relevant QA opportunities, matches them against a configurable candidate profile, removes irrelevant roles, prevents duplicate alerts, and sends notifications for new matches.

### Technical Architecture

The system is built using Node.js, JavaScript and Playwright. I created separate scanners for different career platforms because employers use different systems such as Workday, Eightfold and custom career portals. The scanners normalize the results into a common job structure, which is then passed to a matching engine. The matcher considers role, location, experience and technology keywords and also filters out irrelevant hardware and manufacturing QA positions. Matching jobs are stored locally and the alert manager prevents duplicate notifications before sending new matches through Gmail.

### Why Playwright?

Playwright is used where browser interaction is required for dynamic career sites, pagination, navigation and job-detail extraction. It also provides browser automation capabilities for future application assistance.

### Why separate scanners?

Different companies use different career platforms and APIs. A platform-specific scanner allows the system to handle each source reliably while producing the same normalized job format for the matching layer.

### Duplicate Alert Prevention

Each job is stored using identifying information such as company, job ID and URL. Before sending an alert, the system checks the local job store. Previously alerted jobs are skipped, while previously saved but unconfirmed alerts can be retried.

## Project Status

Current stage: Core job discovery and matching system completed.

Implemented:

- Multi-company career scanning
- Multiple career-platform integrations
- QA job filtering
- Candidate-profile matching
- Experience-aware matching
- Hardware/manufacturing relevance filtering
- Job persistence
- Duplicate prevention
- Gmail alerts
- Alert retry handling
- Gemini API integration
- Git/GitHub version control
- Environment variable protection

Next development stage:

- Scheduled GitHub Actions execution
- Final production cleanup
- Enhanced notification format
- Application assistance with human review

## License

This project is intended as a personal automation and portfolio/interview project.

Career-site content remains the property of the respective employers.





