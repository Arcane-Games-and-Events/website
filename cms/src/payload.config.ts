// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Posts } from './collections/Posts'
import { Authors } from './collections/Authors'
import { Tags } from './collections/Tags'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  cors: [
    'http://localhost:5173', // Local dev
    'https://arcanegamesandevents.com', // Production domain (update this)
    process.env.FRONTEND_URL || '', // Vercel preview URLs
  ].filter(Boolean),
  collections: [Users, Posts, Authors, Tags, Media],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
      max: 20, // Maximum pool size
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection not available
      ssl: {
        rejectUnauthorized: false, // Accept self-signed certificates (for Supabase)
      },
    },
    schemaName: 'payload', // Use separate schema for Payload tables
    push: false, // Disable automatic schema push to prevent data loss
  }),
  sharp,
  plugins: [
    // storage-adapter-placeholder
  ],
})
