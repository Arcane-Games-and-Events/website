import { s3Storage } from '@payloadcms/storage-s3'
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
      max: 10, // Reduced pool size for Supabase pooler
      idleTimeoutMillis: 20000, // Close idle clients after 20 seconds
      connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection not available
      allowExitOnIdle: true, // Allow pool to close when idle
      ssl: {
        rejectUnauthorized: false, // Accept self-signed certificates (for Supabase)
      },
    },
    schemaName: 'payload', // Use separate schema for Payload tables
    push: false, // Disable automatic schema push to prevent data loss
  }),
  sharp,
  plugins: [
    s3Storage({
      collections: {
        media: {
          prefix: 'media',
        },
      },
      bucket: process.env.S3_BUCKET || '',
      config: {
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
        region: process.env.S3_REGION || 'us-east-1',
        endpoint: process.env.S3_ENDPOINT,
        forcePathStyle: true, // Required for Supabase
      },
    }),
  ],
})
