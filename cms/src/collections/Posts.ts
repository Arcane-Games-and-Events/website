import type { CollectionConfig } from 'payload'
import { isAdminEditorOrSelf, canPublish, isEditorOrAdmin } from '../access'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'createdBy', 'author', 'publishedDate', 'accessMode', '_status'],
  },
  access: {
    // Public can read published posts, authenticated users see filtered based on role
    read: ({ req: { user } }) => {
      // If user is authenticated (in admin panel)
      if (user) {
        return isAdminEditorOrSelf({ req: { user } })
      }

      // Public (frontend) can only see published posts
      return {
        _status: {
          equals: 'published',
        }
      }
    },

    // Any authenticated user can create posts
    create: ({ req: { user } }) => {
      return Boolean(user)
    },

    // Admin/Editor can update all, Writers can update their own
    update: ({ req: { user } }) => {
      if (!user) return false

      // Admin and Editor have full access
      if (user.role === 'admin' || user.role === 'editor') {
        return true
      }

      // Writers can only update their own posts
      if (user.role === 'writer') {
        return {
          createdBy: {
            equals: user.id,
          }
        }
      }

      return false
    },

    // Admin/Editor can delete, Writers can delete only their own drafts
    delete: ({ req: { user } }) => {
      if (!user) return false

      if (user.role === 'admin' || user.role === 'editor') {
        return true
      }

      // Writers can only delete their own drafts
      return {
        createdBy: {
          equals: user.id,
        },
        _status: {
          equals: 'draft',
        }
      }
    },
  },
  versions: {
    drafts: {
      autosave: {
        interval: 2000,
      },
    },
  },
  fields: [
    // Override _status field to add publish permission
    {
      name: '_status',
      type: 'select',
      access: {
        create: canPublish,
        update: canPublish,
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly version of the title',
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      admin: {
        description: 'Short summary of the post',
      },
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'editorNotes',
      type: 'array',
      label: 'Editor Feedback',
      admin: {
        description: 'Feedback and notes from editors',
        initCollapsed: false,
      },
      access: {
        // Only editors/admins can create/delete notes
        create: isEditorOrAdmin,
        update: ({ req: { user } }) => {
          // Writers can update (to mark resolved), but field-level control below limits them
          return Boolean(user)
        },
      },
      fields: [
        {
          name: 'content',
          type: 'richText',
          required: true,
          label: 'Note Content',
          access: {
            // Only editors/admins can edit note content
            update: isEditorOrAdmin,
          },
        },
        {
          name: 'noteType',
          type: 'select',
          required: true,
          defaultValue: 'general',
          options: [
            {
              label: 'General Note',
              value: 'general',
            },
            {
              label: 'Revision Request',
              value: 'revision',
            },
            {
              label: 'Feedback',
              value: 'feedback',
            },
            {
              label: 'Approved for Publishing',
              value: 'approved',
            },
            {
              label: 'Needs Work',
              value: 'needs-work',
            },
          ],
          access: {
            // Only editors/admins can change note type
            update: isEditorOrAdmin,
          },
        },
        {
          name: 'createdBy',
          type: 'relationship',
          relationTo: 'users',
          admin: {
            readOnly: true,
            description: 'Editor who created this note',
          },
        },
        {
          name: 'isResolved',
          type: 'checkbox',
          defaultValue: false,
          label: 'Mark as Resolved',
          admin: {
            description: 'Check this when the issue has been addressed',
          },
          // Writers can update this field, editors can too
        },
      ],
    },
    {
      name: 'publishedDate',
      type: 'date',
      required: true,
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'accessMode',
      type: 'select',
      required: true,
      defaultValue: 'Free',
      options: [
        {
          label: 'Free',
          value: 'Free',
        },
        {
          label: 'Premium',
          value: 'Premium',
        },
      ],
      admin: {
        description: 'Premium posts become free after 30 days',
      },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'authors',
      admin: {
        description: 'Public-facing author (from Authors collection)',
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'User who created this post',
      },
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
    },
    {
      name: 'decklists',
      type: 'array',
      label: 'Decklists',
      admin: {
        description: 'Add FaB decklists to embed in the article. Use [DECKLIST:0], [DECKLIST:1], etc. in the content to place them.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'rawText',
          type: 'textarea',
          required: true,
          label: 'Fabrary Export',
          admin: {
            description: 'Copy the full deck text from Fabrary and paste it here. The parser will automatically extract deck name, hero, format, cards, and URL.',
            rows: 20,
          },
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      ({ req, operation, data }) => {
        // Automatically set createdBy on post creation
        if (operation === 'create' && req.user) {
          data.createdBy = req.user.id
        }

        // Automatically set createdBy for new editor notes
        if (data.editorNotes && Array.isArray(data.editorNotes) && req.user) {
          data.editorNotes = data.editorNotes.map((note: any) => {
            // If note doesn't have createdBy or has an empty createdBy, set it to current user
            if (!note.createdBy || (typeof note.createdBy === 'object' && !note.createdBy.id)) {
              return {
                ...note,
                createdBy: req.user.id,
              }
            }
            return note
          })
        }

        return data
      },
    ],
  },
}
