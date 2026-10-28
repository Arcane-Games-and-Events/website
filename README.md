# Arcane Games & Events Website

A full-stack web application for Arcane Games & Events (AGE), a Flesh and Blood TCG tournament organizer. Built with SvelteKit. Articles, videos and courses are written and published in the Desk, the site's own editor at `/desk`.

## Tech Stack

### Frontend (SvelteKit)

- **Framework:** SvelteKit 2 with Svelte 5
- **Styling:** Tailwind CSS 4
- **Database ORM:** Drizzle ORM with PostgreSQL
- **Caching:** Upstash Redis
- **Authentication:** Lucia Auth
- **Payments:** Authorize.net

### Desk (built-in editor)

- **Editor:** Lexical, with card links, decklists, stats tables, images and inline video
- **Database:** the same PostgreSQL database (tables keep their original `cms_` names)
- **Media:** Supabase Storage (bucket `cms-media`); video through Mux or YouTube
- **Analytics:** reader analytics collected in the browser and shown on the Desk

## Project Structure

```
website/
├── src/                    # SvelteKit frontend
│   ├── lib/
│   │   ├── components/     # Reusable Svelte components
│   │   ├── desk/           # Desk editor, widgets and article renderer
│   │   ├── server/         # Server-side modules
│   │   │   ├── cards/      # Card image lookup service
│   │   │   ├── db/         # Database schema and migrations
│   │   │   ├── desk/       # Desk entries, courses, media and lists
│   │   │   └── redis/      # Redis caching utilities
│   │   └── utils/          # Shared utilities
│   └── routes/             # SvelteKit routes
│       ├── admin/          # Admin dashboard
│       ├── desk/           # The Desk: writing, publishing, analytics
│       ├── library/        # Articles and videos
│       ├── events/         # Event pages
│       ├── player/         # Player profiles
│       └── api/            # API endpoints
├── drizzle/                # Database migrations
├── static/                 # Static assets
└── scripts/                # Utility scripts
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- (Optional) Upstash Redis account
- (Optional) Authorize.net sandbox account
- (Optional) Resend account for emails

### Environment Setup

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Configure your environment variables:

```env
# Database (required)
DATABASE_URL=postgresql://user:password@host:port/database

# Desk media uploads (Supabase Storage)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Redis caching (optional - falls back to direct DB queries)
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# Payments (optional - for subscription features)
AUTHNET_API_LOGIN_ID=your_api_login_id
AUTHNET_TRANSACTION_KEY=your_transaction_key
AUTHNET_ENVIRONMENT=sandbox
AUTHNET_PUBLIC_CLIENT_KEY=your_public_client_key

# Email (optional - for password reset, notifications)
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=Arcane Games <noreply@example.com>
```

### Installation

1. Install dependencies:

```bash
npm install
```

2. Push the database schema:

```bash
npm run db:push
```

### Development

```bash
npm run dev   # http://localhost:5173 — the Desk is at /desk
```

## Database

This project uses Drizzle ORM with PostgreSQL.

```bash
# Push schema changes to database
npm run db:push

# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Open Drizzle Studio
npm run db:studio
```

## Features

### Articles & Premium Content

- Articles and videos written, scheduled and published in the Desk
- Premium content with access controls
- Inline FAB card linking with hover previews

### Card System

- Database-backed card lookup with Redis caching
- Support for pitch variants (red/yellow/blue)
- Hover tooltips on desktop, tap modals on mobile
- Admin interface for uploading card data

### Tournament Management

- Event listings and registration
- Live standings and pairings
- Player profiles and match history
- AGE circuit tracking

### Payments

- Premium subscriptions via Authorize.net
- Secure payment processing

## Building for Production

```bash
# Build the frontend
npm run build

# Preview the production build
npm run preview
```

## Deployment

The application is configured for Vercel deployment. See `vercel.json` for configuration.

## Code Quality

```bash
# Format code
npm run format

# Lint code
npm run lint
```

## License

Private - All rights reserved.
