# KalyeWatch Deployment Guide

This document describes the preparation and deployment requirements for KalyeWatch.

KalyeWatch is a Laravel and React application designed for Barangay Panghulo, Malabon City.

The instructions are platform-independent. Actual hosting steps depend on the selected hosting provider.

## 1. Production Requirements

The production environment must provide:

| Component  | Requirement                                                        |
| ---------- | ------------------------------------------------------------------ |
| PHP        | 8.3 or newer                                                       |
| Composer   | Composer 2                                                         |
| Node.js    | Node.js 22 for frontend builds                                     |
| Database   | SQLite, MySQL, or PostgreSQL with compatible Laravel configuration |
| Web server | Nginx, Apache, or a compatible PHP hosting platform                |
| HTTPS      | Valid SSL/TLS certificate                                          |
| Storage    | Persistent private file storage for incident evidence              |
| Email      | Configured production email provider                               |

The production server must support Laravel's writable storage and cache directories.

## 2. Prepare the Production Environment

Before deployment:

1. Select a hosting provider.
2. Configure the application domain.
3. Prepare a production database.
4. Configure persistent storage for uploaded evidence.
5. Configure a production email provider.
6. Configure HTTPS.
7. Set the production environment variables.

Do not use the development environment for a public production deployment.

## 3. Configure Environment Variables

Create a production `.env` file using `.env.example` as a reference.

Important settings:

```env
APP_NAME=KalyeWatch
APP_ENV=production
APP_KEY=your-secure-existing-or-generated-key
APP_DEBUG=false
APP_URL=https://your-domain.example

LOG_CHANNEL=stack
LOG_LEVEL=warning

DB_CONNECTION=mysql
DB_HOST=your-database-host
DB_PORT=3306
DB_DATABASE=your-database-name
DB_USERNAME=your-database-user
DB_PASSWORD=your-secure-database-password

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database

FILESYSTEM_DISK=local

MAIL_MAILER=smtp
MAIL_HOST=your-mail-host
MAIL_PORT=587
MAIL_USERNAME=your-mail-username
MAIL_PASSWORD=your-mail-password
MAIL_SCHEME=null
MAIL_FROM_ADDRESS=your-verified-sender@example.com
MAIL_FROM_NAME="${APP_NAME}"
```

Replace example values with credentials supplied by your hosting, database, and email providers.

The database example above uses MySQL. Configure the actual database connection according to the production database selected.

Important:

- Never commit `.env` to GitHub.
- Never share database passwords or application keys.
- Keep `APP_DEBUG=false` in production.
- Set `APP_URL` to the real HTTPS domain.
- Generate `APP_KEY` when initializing a new installation.
- Never regenerate an existing production application key casually, because doing so can invalidate encrypted application data.

## 4. Install Application Dependencies

Clone the repository on the production environment:

```bash
git clone https://github.com/debed29/KalyeWatch.git
cd KalyeWatch
```

Install production PHP dependencies:

```bash
composer install --no-dev --optimize-autoloader --no-interaction
```

Install frontend dependencies:

```bash
npm ci
```

Build production frontend assets:

```bash
npm run build
```

This generates the compiled frontend assets used by Laravel.

The production application must use the generated assets rather than relying on the Vite development server.

## 5. Configure the Database

Make sure the production database exists and the configured database user has the required permissions.

Run the database migrations:

```bash
php artisan migrate --force
```

This creates the tables required by KalyeWatch, including:

- Users
- Incidents
- Incident images
- Incident status histories
- Notifications
- Laravel sessions and cache
- Queue and job support tables

Review pending migrations before applying them to production.

Do not use `migrate:fresh` on a production database.

## 6. Configure Storage

KalyeWatch stores incident evidence images using Laravel's private local storage disk.

The current application uses the local disk configured under:

```text
config/filesystems.php
```

The private storage root is:

```text
storage/app/private
```

Production requirements:

1. Ensure the application can write to the private storage directory.
2. Ensure the directory persists across application restarts and deployments.
3. Ensure the directory is not publicly accessible.
4. Restrict access to evidence images through the authorized administrator evidence endpoint.
5. Include uploaded evidence in the backup process.

Do not expose private evidence by placing it in `public/`.

The public storage symbolic link is not required for private incident evidence.

If the hosting provider uses temporary or ephemeral storage, configure persistent storage or a suitable private object-storage solution before accepting real incident uploads. Any storage driver change must be tested against the application's evidence upload and retrieval features.

## 7. Configure Email

KalyeWatch requires a working email configuration for account verification and related application email functions.

Before production launch:

1. Choose an email provider.
2. Configure SMTP or another supported Laravel mail transport.
3. Set the sender address and sender name.
4. Verify the sender domain with the provider when required.
5. Test registration and email verification.
6. Check production logs when email delivery fails.

The example environment uses the Laravel log mailer by default. This is useful during development but should not be treated as a production email delivery solution.

## 8. Configure Production Security

Before making KalyeWatch publicly accessible:

- Disable application debug output.
- Use HTTPS.
- Protect the production `.env` file.
- Use strong database credentials.
- Restrict administrator access.
- Keep incident evidence private.
- Ensure the web server document root points to Laravel's `public/` directory.
- Keep application source code and private storage outside public web access.
- Use a secure backup location.
- Apply security updates to the server and application dependencies.

Never grant public registration the ability to assign administrator privileges.

New users receive the `community_user` role by default. Administrator promotion should be performed only by authorized project operators.

Avoid insecure permission shortcuts such as recursively assigning `777` to the application directories.

## 9. Optimize the Application

After environment variables and dependencies are configured, run:

```bash
php artisan optimize
```

This enables Laravel's production optimization for configuration, routes, events, and views.

If configuration changes are made after caching, rebuild the appropriate caches.

Make sure the web server and PHP process have access to the required writable Laravel directories.

## 10. Queue and Background Jobs

The current application is configured to use Laravel's database queue connection by default.

If queued jobs are introduced or enabled in production, configure a supervised queue worker:

```bash
php artisan queue:work database --tries=3
```

Use the hosting provider's process manager or service supervisor to keep the worker running.

Monitor failed jobs:

```bash
php artisan queue:failed
```

The current database notifications should also be tested after deployment.

## 11. Backup and Recovery

A production backup plan should include:

- Production database
- Private incident evidence files
- Environment and deployment configuration stored securely
- Relevant application logs, according to the retention policy

Test database restoration and evidence-file recovery before accepting real community reports.

Database backups and evidence backups should be coordinated so incident records continue to reference their corresponding evidence files.

## 12. Production Verification Checklist

After deployment, verify the following:

### Application access

- [ ] The application domain loads over HTTPS.
- [ ] The login page works.
- [ ] Community registration works.
- [ ] Email verification works.
- [ ] Dashboard access works.

### Incident reporting

- [ ] Community users can submit reports.
- [ ] Panghulo boundary validation works.
- [ ] Evidence images can be uploaded.
- [ ] Evidence images remain private.
- [ ] Community users can view their own reports and history.

### Administrator features

- [ ] Administrator authentication works.
- [ ] Incident review queue loads.
- [ ] Reports can be marked under review.
- [ ] Reports can be verified or rejected.
- [ ] Notifications are delivered and displayed.
- [ ] Incident analytics loads.
- [ ] CSV exports work.
- [ ] Incident audit trail loads and filters correctly.

### Public safety map

- [ ] Street GeoJSON data is available.
- [ ] The safety map renders correctly.
- [ ] Only verified incident aggregates are displayed.
- [ ] Exact coordinates and private reporter information are not exposed.

### Operations

- [ ] Logs can be accessed securely.
- [ ] Database backups are configured.
- [ ] Private evidence backups are configured.
- [ ] Persistent storage works after redeployment.
- [ ] Production error reporting works without exposing sensitive information.

## 13. Deployment Status

This document describes the production deployment requirements and procedures.

It does not indicate that KalyeWatch has already been deployed.

The hosting provider, production domain, database service, email provider, and production credentials must be selected and configured before the system can be considered production-ready.

---

**Project:** KalyeWatch
**Repository:** https://github.com/debed29/KalyeWatch
**Target Community:** Barangay Panghulo, Malabon City
