import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'role'],
    // Hide Users collection from non-admins in the admin nav
    hidden: ({ user }) => user?.role !== 'admin',
  },
  auth: true,
  access: {
    // Only admins can create new users
    create: ({ req: { user } }) => {
      return user?.role === 'admin'
    },
    // All authenticated users can read user info (for relationships/display)
    // But only admins can manage users in the admin panel
    read: ({ req: { user } }) => {
      // Any authenticated user can read user information
      return Boolean(user)
    },
    // Admins can update all, users can update themselves
    update: ({ req: { user } }) => {
      if (!user) return false

      if (user.role === 'admin') {
        return true
      }

      return {
        id: {
          equals: user.id,
        }
      }
    },
    // Only admins can delete users
    delete: ({ req: { user } }) => {
      return user?.role === 'admin'
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'writer',
      options: [
        {
          label: 'Writer',
          value: 'writer',
        },
        {
          label: 'Editor',
          value: 'editor',
        },
        {
          label: 'Admin',
          value: 'admin',
        },
      ],
      access: {
        // Only admins can change roles
        update: ({ req: { user } }) => {
          return user?.role === 'admin'
        },
      },
    },
  ],
}
