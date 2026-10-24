# File Uploader

**Filebox**, a stripped-down Google Drive: sign up, make folders, upload files, download them and share a folder with a link that expires. Built with Express, Prisma, Passport and PostgreSQL for The Odin Project NodeJS course.

## Features

- Sign up and log in with Passport. Sessions are stored in the database with the Prisma session store
- Folders inside folders: create, rename and delete them. Deleting a folder deletes everything inside it
- Upload one file at a time with multer, up to 10 MB. Allowed types: JPG, PNG, GIF, WEBP, PDF, TXT, MD, CSV, DOCX, XLSX, PPTX, ZIP, MP3 and MP4
- A details page for every file (name, size, type and upload time) with a Download button
- Files are stored on your computer while you develop, or in Supabase Storage when deployed. The file's storage URL is saved in the database
- Share a folder (extra credit): pick how many days the link works (1 to 30). Anyone with the link can browse the folder and its subfolders and download files, without an account. You can stop sharing at any time
- Each user only ever sees their own files and folders
- Dark mode that follows your system setting, plus a Dark/Light toggle, and a layout that works on phones

## Database design

```
User                     Folder                       File                     ShareLink
--------------------     --------------------------   ----------------------   ----------------------
id          PK           id         PK                id          PK           id         PK (UUID)
name                     name                         name                     expiresAt
email       unique       ownerId    FK -> User        size        bytes        folderId   FK -> Folder
passwordHash  bcrypt     parentId   FK -> Folder      mimeType                 createdAt
createdAt                createdAt  (empty = top      storageKey  unique
                         updatedAt   level)           url
                                                      ownerId     FK -> User
                                                      folderId    FK -> Folder (empty = top level)
                                                      createdAt
```

- A folder can hold other folders, so folders form a tree. Folders and files with no parent sit at the top of "My Drive".
- Deleting a folder deletes its subfolders, files and share links. The app also removes those files from storage.
- The `Session` table holds log-in sessions for `@quixo3/prisma-session-store`.

The schema is in [`prisma/schema.prisma`](prisma/schema.prisma).

## Routes

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/drive` | My Drive (the top level) |
| POST | `/drive/folders`, `/folders/:id/folders` | Create a folder |
| POST | `/drive/upload`, `/folders/:id/upload` | Upload a file |
| GET | `/folders/:id` | A folder's contents |
| GET/POST | `/folders/:id/rename` | Rename a folder |
| GET/POST | `/folders/:id/delete` | Delete a folder and everything in it |
| GET | `/files/:id` | File details |
| GET | `/files/:id/download` | Download a file |
| POST | `/files/:id/delete` | Delete a file |
| POST | `/folders/:id/share` | Create a share link |
| POST | `/share-links/:id/delete` | Stop sharing |
| GET | `/share/:linkId` | Shared folder (public) |
| GET | `/share/:linkId/folders/:id` | Subfolder of a shared folder (public) |
| GET | `/share/:linkId/files/:id/download` | Download a shared file (public) |

Plus `/sign-up`, `/log-in` and `/log-out`.

## Run locally

You need [Node.js](https://nodejs.org/) and [PostgreSQL](https://www.postgresql.org/download/).

1. Create a database and user in `psql`. `CREATEDB` lets Prisma make a temporary database while it creates migrations:
   ```sql
   CREATE USER uploader_user WITH PASSWORD 'uploader_pass' CREATEDB;
   CREATE DATABASE file_uploader OWNER uploader_user;
   ```
2. Copy `.env.example` to `.env`. The defaults work for local development.
3. Install, create the tables, add a demo account and start the server:
   ```bash
   npm install
   npx prisma migrate dev
   npm run seed
   npm start
   ```
   `npm install` also generates the Prisma Client.
4. Open [http://localhost:3000](http://localhost:3000) and log in as `demo@example.com` with the password `demo12345`, or create your own account.

Uploaded files go into the `uploads` folder, which git ignores.

## Store files in Supabase

1. Create a project at [supabase.com](https://supabase.com/). Under **Storage**, create a bucket called `files` and leave it **private**.
2. From the project's API settings, copy the project URL and the service role (secret) key.
3. Set these in `.env`:
   ```
   STORAGE_DRIVER=supabase
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   SUPABASE_BUCKET=files
   ```

Because the bucket is private, nobody can open a file just by knowing its URL. Downloads go through the app, which checks that you own the file (or have a valid share link), then sends you to a download link that only works for one minute.

Keep the service role key secret. It has full access to your Supabase project, so never commit it or use it in browser code.

## Deploy

1. Create a hosted PostgreSQL database. Supabase gives you one with your project, or use [Neon](https://neon.tech/).
2. Deploy this folder to a Node host such as [Render](https://render.com/) or [Railway](https://railway.com/):
   - Root directory: `File Uploader`
   - Build command: `npm install && npx prisma migrate deploy`
   - Start command: `npm start`
   - Environment variables: `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV=production`, `STORAGE_DRIVER=supabase`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_BUCKET`
3. Use Supabase storage when deployed. Hosts like Render wipe their disk on every deploy, so files in the `uploads` folder would disappear.

To make a strong `SESSION_SECRET`, run:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Notes

- This uses **Prisma 7**: the database URL lives in `prisma.config.js`, and the client connects through the `@prisma/adapter-pg` driver adapter. The Prisma packages are pinned to `7.10.1`, because npm's `latest` tag for the Prisma CLI currently points to an 8.0 release candidate.
- One-time messages like "Uploaded notes.txt" are saved before the redirect, and only real pages use them up, so they always appear on the right page.
