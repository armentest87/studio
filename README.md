# JiraViz - Jira Insights Dashboard

JiraViz is a Next.js web application designed to provide insightful visualizations and analytics for Jira issue data. It helps agile teams, project managers, and stakeholders monitor project progress, team performance, and issue trends.

This application is built with Next.js, React, ShadCN UI, Tailwind CSS, and Genkit (for potential future AI integrations).

## Core Features (Current Implementation)

-   **Configuration Sidebar**: Allows users to input Jira instance URL, email, and API token.
-   **Flexible Filtering**: Supports fetching Jira issues using either a direct JQL query or by project key, date range, and issue type.
-   **Tabbed Dashboard Layout**: Organizes various metrics and analyses into accessible tabs:
    -   Overview
    -   Agile Metrics
    -   Team Workload
    -   Quality Analysis
    -   Custom Analysis
    -   Advanced Metrics (CFD)
    -   User Workload Report
-   **Data Display**: Currently, most tabs display mock data or static visualizations. The "Fetch Issues" functionality is connected to a server action that logs inputs and returns mock issue data.
-   **Data Context**: Uses React Context to manage fetched Jira data, loading states, and errors across the application.

## Getting Started

### Prerequisites

-   Node.js (version 18.x or later recommended)
-   npm or yarn
-   Access to a Jira Cloud instance with an API token (generate at `https://id.atlassian.com/manage-profile/security/api-tokens`).

### Installation

1.  **Clone the repository**:
    ```bash
    git clone <your-repository-url>
    cd jiraviz # Or your project directory name
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Set up environment variables**:
    Copy the `.env.example` file to a new file named `.env.local`:
    ```bash
    cp .env.example .env.local
    ```
    Open `.env.local` and fill in your Jira API credentials and instance URL:
    ```
    NEXT_PUBLIC_JIRA_URL="https://your-domain.atlassian.net"
    NEXT_PUBLIC_JIRA_EMAIL="your-jira-email@example.com"
    NEXT_PUBLIC_JIRA_API_TOKEN="your-jira-api-token"
    ```
    These values will pre-fill the configuration sidebar for convenience.

### Running the Development Server

Start the Next.js development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:9002](http://localhost:9002) (or the port specified in your `package.json`'s `dev` script) with your browser to see the result.

## Next Steps

-   Implement actual Jira API calls in `src/actions/jira-actions.ts` to fetch real data.
-   Connect the dashboard tabs to the `JiraDataContext` to display and visualize the fetched data dynamically.
-   Expand upon the existing mock visualizations with real data transformations and Plotly/Recharts integrations.
```