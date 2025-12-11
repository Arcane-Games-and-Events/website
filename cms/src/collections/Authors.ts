import type { CollectionConfig } from 'payload'

export const Authors: CollectionConfig = {
  slug: 'authors',
  admin: {
    useAsTitle: 'name',
  },
  access: {
    read: () => true, // Allow public read access
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly version of the name',
      },
    },
    {
      name: 'bio',
      type: 'richText',
    },
    {
      name: 'profilePicture',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'socialLinks',
      type: 'array',
      label: 'Social & Profile Links',
      admin: {
        description: 'Add links to your social media, website, coaching services, etc.',
      },
      fields: [
        {
          name: 'platform',
          type: 'select',
          required: true,
          options: [
            { label: 'Twitter / X', value: 'twitter' },
            { label: 'Bluesky', value: 'bluesky' },
            { label: 'YouTube', value: 'youtube' },
            { label: 'Twitch', value: 'twitch' },
            { label: 'Discord', value: 'discord' },
            { label: 'Patreon', value: 'patreon' },
            { label: 'Metafy', value: 'metafy' },
            { label: 'Ko-fi', value: 'kofi' },
            { label: 'Instagram', value: 'instagram' },
            { label: 'TikTok', value: 'tiktok' },
            { label: 'Website', value: 'website' },
            { label: 'Other', value: 'other' },
          ],
          admin: {
            width: '50%',
          },
        },
        {
          name: 'customLabel',
          type: 'text',
          admin: {
            width: '50%',
            description: 'Custom label (only shown if "Other" is selected)',
            condition: (data, siblingData) => siblingData?.platform === 'other',
          },
        },
        {
          name: 'url',
          type: 'text',
          required: true,
          admin: {
            description: 'Full URL (e.g., https://twitter.com/username)',
          },
        },
      ],
    },
  ],
}
