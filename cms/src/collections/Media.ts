import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    // Convert all images to webp for better compression
    formatOptions: {
      format: 'webp',
      options: {
        quality: 80,
      },
    },
    // Generate responsive sizes for different use cases
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: undefined, // Maintain aspect ratio
        formatOptions: {
          format: 'webp',
          options: { quality: 75 },
        },
      },
      {
        name: 'card',
        width: 800,
        height: undefined,
        formatOptions: {
          format: 'webp',
          options: { quality: 80 },
        },
      },
      {
        name: 'featured',
        width: 1200,
        height: undefined,
        formatOptions: {
          format: 'webp',
          options: { quality: 85 },
        },
      },
    ],
    // Resize large uploads to reasonable max dimensions
    resizeOptions: {
      width: 2000,
      height: 2000,
      fit: 'inside', // Maintain aspect ratio, fit within bounds
    },
    mimeTypes: ['image/*'],
  },
}
