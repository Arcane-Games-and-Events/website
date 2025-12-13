# Arcane Games & Events Website

A full-stack web application for Arcane Games & Events (AGE), a Flesh and Blood TCG tournament organizer. Built with SvelteKit and Payload CMS.

## Tech Stack

### Frontend (SvelteKit)

- **Framework:** SvelteKit 2 with Svelte 5
- **Styling:** Tailwind CSS 4
- **Database ORM:** Drizzle ORM with PostgreSQL
- **Caching:** Upstash Redis
- **Authentication:** Lucia Auth
- **Payments:** Authorize.net

### CMS (Payload)

- **Framework:** Payload CMS 3 with Next.js 15
- **Database:** PostgreSQL (shared with frontend)
- **Storage:** S3-compatible storage for media
- **Rich Text:** Lexical editor with custom card linking

## Project Structure

```
website/
├── src/                    # SvelteKit frontend
│   ├── lib/
│   │   ├── components/     # Reusable Svelte components
│   │   ├── server/         # Server-side modules
│   │   │   ├── cards/      # Card image lookup service
│   │   │   ├── db/         # Database schema and migrations
│   │   │   ├── payload/    # Payload CMS client
│   │   │   └── redis/      # Redis caching utilities
│   │   └── utils/          # Shared utilities
│   └── routes/             # SvelteKit routes
│       ├── admin/          # Admin dashboard
│       ├── articles/       # Article pages
│       ├── events/         # Event pages
│       ├── player/         # Player profiles
│       └── api/            # API endpoints
├── cms/                    # Payload CMS
│   └── src/
│       ├── collections/    # CMS content types
│       └── blocks/         # Rich text blocks
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

# Payload CMS (required)
PAYLOAD_URL=http://localhost:3000
PAYLOAD_SECRET=your_payload_secret_key

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

1. Install frontend dependencies:

```bash
npm install
```

2. Install CMS dependencies:

```bash
cd cms && npm install
```

3. Push the database schema:

```bash
npm run db:push
```

### Development

Run both the SvelteKit frontend and Payload CMS:

```bash
# Terminal 1 - SvelteKit (port 5173)
npm run dev

# Terminal 2 - Payload CMS (port 3000)
cd cms && npm run dev
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

- Rich text articles with Lexical editor
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

For the CMS, a Dockerfile is provided in the `cms/` directory for container deployments.

## Code Quality

```bash
# Format code
npm run format

# Lint code
npm run lint
```

## License

Private - All rights reserved.
