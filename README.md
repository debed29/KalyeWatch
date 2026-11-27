# KalyeWatch

**A Community-Based Street Safety and Incident Reporting System for Barangay Panghulo, Malabon City.**

KalyeWatch is a web application that helps community members report incidents, monitor report statuses, and access verified street safety information. It also provides administrators with tools for reviewing reports, managing incident records, analyzing safety data, and monitoring incident status changes.

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Requirements](#system-requirements)
- [Installation and Setup](#installation-and-setup)
- [Administrator Account Setup](#administrator-account-setup)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Application Structure](#application-structure)
- [Security and Privacy](#security-and-privacy)
- [Deployment](#deployment)
- [Project Scope](#project-scope)

## Project Overview

KalyeWatch focuses on improving community awareness and incident reporting in Barangay Panghulo, Malabon City.

The system has two primary user roles:

**Community User**

- Register and log in to the application.
- Submit incident reports.
- Attach evidence images to reports.
- Track submitted incident reports.
- View incident status history.
- Receive report status notifications.
- View the public safety map.

**Administrator**

- Review community-submitted incident reports.
- Mark reports as under review.
- Verify or reject incident reports.
- Assign severity levels to verified reports.
- View incident analytics.
- Export incident reports as CSV files.
- Access the system-wide incident audit trail.
- Review recorded status changes and administrator actions.

## Key Features

### 1. Incident Reporting

Community users can submit incident reports containing:

- Incident category
- Incident date and time
- Location description
- Incident description
- Map-selected coordinates
- Optional evidence images

The application validates that the selected coordinates are within Barangay Panghulo before accepting a report.

Up to five evidence images can be uploaded per report. Supported formats are JPEG, JPG, PNG, and WebP, with a maximum file size of 5 MB per image.

### 2. Administrator Incident Review

Administrators can process submitted reports through these statuses:

- Pending
- Under Review
- Verified
- Rejected

Administrators must assign a severity level when verifying a report:

- Low
- Moderate
- High
- Critical

A rejection requires an explanation, which is recorded in the incident history and sent to the reporter through an application notification.

### 3. Public Safety Map

The public safety map displays street information and aggregated statistics from verified incidents.

The map uses GeoJSON street geometry prepared for Barangay Panghulo.

The public map does not expose exact incident coordinates, reporter identities, or private incident descriptions.

### 4. Incident Analytics

Administrators can view:

- Total incident reports
- Reports awaiting review
- Verified incidents
- Rejected reports
- High-severity incidents
- Monthly verified incident trends
- Incident category breakdown
- Severity distribution
- Frequently reported locations

Analytics can be filtered by incident date.

### 5. CSV Incident Export

Administrators can export incident reports as CSV files.

Available filters include:

- Date range
- Incident category
- Report status
- Severity

Exact coordinates and private evidence storage paths are excluded from exports.

### 6. Incident Audit Trail

Administrators can inspect recorded incident status changes, including:

- Previous and new status
- Incident category
- Administrator or user who performed the action
- Action date and time
- Assigned severity, when applicable
- Recorded explanation or reason

The audit trail supports filtering by action date, status, and category, with paginated results.

### 7. Notifications

KalyeWatch uses Laravel database notifications for:

- Incident status updates to reporters
- Community safety alerts for verified incidents
- Individual notification read status
- Marking all notifications as read

Community safety alerts are sent to eligible verified community accounts and do not include private reporter information or exact incident coordinates.

## Technology Stack

| Component          | Technology               |
| ------------------ | ------------------------ |
| Backend            | PHP and Laravel 13       |
| Frontend           | React 19                 |
| Language           | TypeScript               |
| Application Bridge | Inertia.js 3             |
| Styling            | Tailwind CSS 4           |
| Maps               | Leaflet 1.9              |
| Map Data           | GeoJSON                  |
| Database           | SQLite by default        |
| Build Tooling      | Vite Plus                |
| Testing            | Pest 5 and PHPUnit       |
| Code Quality       | Laravel Pint and PHPStan |

## System Requirements

For local development, install:

- PHP 8.3 or newer
- Composer 2
- Node.js 22
- npm
- SQLite with PHP PDO SQLite support
- Git

A compatible database such as MySQL or PostgreSQL can also be configured through Laravel's database environment settings.

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/debed29/KalyeWatch.git
```

Navigate into the project directory:

```bash
cd KalyeWatch
```

### 2. Install PHP Dependencies

```bash
composer install
```

### 3. Create the Environment File

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Open `.env` and configure the local application settings.

At minimum, set:

```env
APP_NAME=KalyeWatch
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=sqlite
```

Keep `.env` private. Never commit it to the repository.

### 4. Create the SQLite Database

On Windows PowerShell, create the database file if it does not exist:

```powershell
if (-not (Test-Path database/database.sqlite)) {
    New-Item -ItemType File -Path database/database.sqlite
}
```

### 5. Generate the Application Key

```bash
php artisan key:generate
```

### 6. Run Database Migrations

```bash
php artisan migrate
```

This creates the application tables, including users, incidents, incident images, incident status histories, notifications, sessions, and supporting Laravel tables.

Do not use `migrate:fresh` on a database containing reports or other data you need to preserve.

### 7. Install Frontend Dependencies

```bash
npm ci
```

### 8. Start the Development Environment

```bash
composer run dev
```

Open the local application at:

http://localhost:8000

## Administrator Account Setup

Newly registered accounts receive the `community_user` role by default.

There is no preconfigured administrator account in the default database seeder.

To create an administrator for local development:

1. Register an account through the application.
2. Open the project terminal.
3. Promote the registered account using Laravel Tinker.

Example:

```bash
php artisan tinker
```

Execute the following command, replacing the email with the registered account's email:

```php
App\Models\User::where('email', 'admin@example.com')
    ->update(['role' => 'administrator']);
```

The administrator should sign in again to access administrator-only navigation and features.

**Security:** Only trusted project operators should be allowed to promote accounts to administrator. Do not expose administrator role assignment to public registration.

## Running the Application

Start the complete local development environment:

```bash
composer run dev
```

Frontend-only development server:

```bash
npm run dev
```

Build frontend assets:

```bash
npm run build
```

Clear Laravel configuration cache during development:

```bash
php artisan config:clear
```

## Testing

Run all automated tests:

```bash
php artisan test
```

Run the complete project quality checks:

```bash
composer ci:check
```

The complete check includes:

- Frontend formatting
- Frontend linting
- TypeScript validation
- Laravel Pint
- PHPStan static analysis
- Automated feature and unit tests

## Application Structure

Important project directories:

```text
KalyeWatch/
├── app/
│   ├── Http/
│   │   └── Controllers/
│   │       ├── Admin/
│   │       ├── IncidentController.php
│   │       ├── NotificationController.php
│   │       └── PublicSafetyMapController.php
│   ├── Models/
│   ├── Notifications/
│   └── Services/
│
├── database/
│   ├── factories/
│   ├── migrations/
│   └── seeders/
│
├── resources/
│   ├── css/
│   ├── data/
│   │   ├── panghulo-boundary.geojson
│   │   └── panghulo-streets.geojson
│   ├── js/
│   │   ├── components/
│   │   └── pages/
│   └── views/
│
├── routes/
│   ├── web.php
│   └── settings.php
│
├── scripts/
├── tests/
├── public/
├── storage/
├── composer.json
└── package.json
```

## Security and Privacy

KalyeWatch implements several security controls:

- Authentication and email verification for protected application routes.
- Administrator role checks for administrator functions.
- Server-side validation of incident submissions.
- Server-side validation of Panghulo geographic boundaries.
- Private storage for incident evidence images.
- Administrator authorization before serving private evidence.
- Validation of evidence image ownership and MIME type.
- Transaction-based incident status changes and history recording.
- Protection against duplicate review transitions.
- CSV formula-injection protection.
- Restricted public incident information.

Evidence images are stored using Laravel's private local storage disk. They should not be placed in publicly accessible directories.

## Deployment

For production deployment, configure:

- Production environment variables
- A persistent database
- A secure application key
- HTTPS and a valid domain
- A configured email provider
- Writable Laravel storage and cache directories
- Persistent private evidence storage
- Production frontend assets

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the deployment checklist.

## Project Scope

KalyeWatch is designed to support community incident reporting and street safety awareness in Barangay Panghulo, Malabon City.

The application is an information and reporting platform. It does not replace emergency services, police reporting procedures, or official emergency response systems.

---

**Repository:** https://github.com/debed29/KalyeWatch
