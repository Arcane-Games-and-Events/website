import type { CollectionConfig } from 'payload'
import { isAdminEditorOrSelf, canPublish, isEditorOrAdminField } from '../access'

/**
 * Extract plain text from Lexical richText content
 */
function extractTextFromLexical(content: any): string {
  if (!content || !content.root) return ''

  const extractText = (node: any): string => {
    if (!node) return ''

    // Text node
    if (node.type === 'text' && node.text) {
      return node.text
    }

    // Node with children
    if (node.children && Array.isArray(node.children)) {
      return node.children.map(extractText).join(' ')
    }

    return ''
  }

  return extractText(content.root)
}

/**
 * Calculate read time from word count (200 words per minute)
 */
function calculateReadTime(content: any): number {
  const text = extractTextFromLexical(content)
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length
  const minutes = Math.ceil(wordCount / 200)
  return Math.max(1, minutes) // Minimum 1 minute
}

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'createdBy', 'author', 'publishedDate', 'accessMode', '_status'],
  },
  access: {
    // Public can read published posts, authenticated users see filtered based on role
    read: ({ req }) => {
      // If user is authenticated (in admin panel)
      if (req.user) {
        return isAdminEditorOrSelf({ req })
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
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
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
        create: isEditorOrAdminField,
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
            update: isEditorOrAdminField,
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
            update: isEditorOrAdminField,
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
        position: 'sidebar',
        description: 'User who created this post',
      },
      access: {
        // Only admins and editors can change the createdBy field
        update: isEditorOrAdminField,
      },
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
    },
    {
      name: 'readTime',
      type: 'number',
      admin: {
        position: 'sidebar',
        description: 'Estimated read time in minutes (auto-calculated)',
        readOnly: true,
      },
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
          const userId = req.user.id
          data.editorNotes = data.editorNotes.map((note: any) => {
            // If note doesn't have createdBy or has an empty createdBy, set it to current user
            if (!note.createdBy || (typeof note.createdBy === 'object' && !note.createdBy.id)) {
              return {
                ...note,
                createdBy: userId,
              }
            }
            return note
          })
        }

        // Calculate read time from content
        if (data.content) {
          data.readTime = calculateReadTime(data.content)
        }

        return data
      },
    ],
  },
}
