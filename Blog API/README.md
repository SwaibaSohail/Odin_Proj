# Blog API

A blog split into three apps that talk to each other over HTTP, built for The Odin Project NodeJS course:

| App | Folder | What it's for |
|-----|--------|---------------|
| **API** | [`api/`](api) | Express + Prisma + PostgreSQL. Only sends JSON. Logs authors in with JSON Web Tokens |
| **Reader site** | [`reader/`](reader) | The public blog ("Notebook"). Read posts and leave comments, no account needed |
| **Author site** | [`author/`](author) | Just for you. Log in, write drafts, publish or unpublish posts, and edit or delete comments |

Both websites are plain HTML, CSS and JavaScript that use `fetch` to call the API. They have dark mode and work on phones.

**Live demo:** the [reader site](https://swaibasohail.github.io/Odin_Proj/Blog%20API/reader/) and the [author site](https://swaibasohail.github.io/Odin_Proj/Blog%20API/author/). The API runs on Render's free plan, which sleeps when nobody uses it, so the first visit can take up to a minute to load.

## Database design

```
User                       Post                          Comment
-----------------------    ---------------------------   ----------------------
id            PK           id           PK               id         PK
username      unique       title                         name       (commenter's name)
name                       body                          body
passwordHash  bcrypt       published    true/false       createdAt
role          AUTHOR or    publishedAt  first publish    updatedAt
              READER       createdAt                     postId     FK -> Post
createdAt                  updatedAt
                           authorId     FK -> User
```

- **Drafts:** a post is a draft until `published` is true. Drafts stay in the database but only their author can see them. `publishedAt` is set the first time a post goes live and stays the same if it's unpublished and published again.
- **Comments** don't need an account, just a name. They don't have titles. Posts and comments both show dates.
- **Roles:** the `role` field lets the API tell authors (who can write) apart from normal accounts, which are there for future features.
- Deleting a post deletes its comments.

The schema is in [`api/prisma/schema.prisma`](api/prisma/schema.prisma).

## API

All routes start with `/api`. Protected routes need the header `Authorization: Bearer <token>`, using the token from logging in.

| Method | Route | Who | What it does |
|--------|-------|-----|--------------|
| POST | `/auth/login` | Anyone | `{ username, password }` → `{ token, user }`. The token lasts 7 days |
| GET | `/auth/me` | Logged in | The logged-in user |
| GET | `/posts` | Anyone | Published posts, newest first, with an excerpt and comment count |
| GET | `/posts?status=all` | Author | Your posts, drafts included (`status` can also be `draft` or `published`) |
| GET | `/posts/:id` | Anyone | One published post (authors can also open their own drafts) |
| POST | `/posts` | Author | `{ title, body, published? }` → 201. New posts are drafts unless `published` is true |
| PATCH | `/posts/:id` | Author | Change any of `title`, `body`, `published`. Send `{ "published": true }` to publish |
| DELETE | `/posts/:id` | Author | Delete a post and its comments → 204 |
| GET | `/posts/:id/comments` | Anyone | A post's comments, oldest first |
| POST | `/posts/:id/comments` | Anyone | `{ name, body }` → 201. Only on published posts |
| PATCH | `/comments/:id` | Author | `{ body }`. Edit a comment on your post |
| DELETE | `/comments/:id` | Author | Delete a comment on your post → 204 |

Errors come back as JSON with a matching status code (400, 401, 403, 404). Validation errors list each field:

```json
{
  "error": "Some fields need fixing.",
  "details": [{ "field": "title", "message": "Title is required." }]
}
```

Try it with curl (on Windows, type `curl.exe`) or with [Postman](https://www.postman.com/downloads/):

```bash
# Log in and copy the token from the reply
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"author","password":"notebook123"}'

# Create a draft
curl -X POST http://localhost:3000/api/posts -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"title":"Hello","body":"My first post."}'
```

## Run it locally

You need [Node.js](https://nodejs.org/) and [PostgreSQL](https://www.postgresql.org/download/). Use three terminals, one per app.

**1. The API** (port 3000)

Create a database and user in `psql`. `CREATEDB` lets Prisma make a temporary database while it creates migrations:

```sql
CREATE USER blog_user WITH PASSWORD 'blog_pass' CREATEDB;
CREATE DATABASE blog_api OWNER blog_user;
```

Then copy `api/.env.example` to `api/.env` and run:

```bash
cd "Blog API/api"
npm install
npx prisma migrate dev
npm run seed
npm start
```

`npm run seed` **resets** the blog. It deletes everything, then creates the author account `author` (password `notebook123`, or `SEED_PASSWORD` from `.env`), three published posts with comments and one draft.

**2. The reader site** (port 5173)

```bash
cd "Blog API/reader"
npx serve -l 5173
```

**3. The author site** (port 5174)

```bash
cd "Blog API/author"
npx serve -l 5174
```

Open [http://localhost:5173](http://localhost:5173) to read the blog, and [http://localhost:5174](http://localhost:5174) to write. Log in as `author` / `notebook123`.

The websites only need a static file server. The `serve.json` in each folder stops `serve` from rewriting `post.html?id=3` into `/post`, which would lose the `?id=3`.

## Deploy

**API:** deploy `Blog API/api` to a Node host such as [Render](https://render.com/) or [Railway](https://railway.com/), with a hosted PostgreSQL database (for example [Neon](https://neon.tech/)):
- Root directory: `Blog API/api`
- Build command: `npm install && npx prisma migrate deploy`
- Start command: `npm start`
- Environment variables:
  - `DATABASE_URL`
  - `JWT_SECRET`: a long random string. Make one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - `CORS_ORIGINS`: the addresses of your two websites, separated by commas. Use just the origin, like `https://swaibasohail.github.io`, without the path

To add the author account and posts to the live database, temporarily set `DATABASE_URL` in `api/.env` to the hosted database, add a private `SEED_PASSWORD`, and run `npm run seed` once.

**Websites:** they're static files, so any static host works. This repo uses GitHub Pages, so they're at:
- `https://swaibasohail.github.io/Odin_Proj/Blog%20API/reader/`
- `https://swaibasohail.github.io/Odin_Proj/Blog%20API/author/`

Each site's `js/config.js` picks which API to call. On `localhost` it uses `http://localhost:3000/api`, and anywhere else it uses the deployed API at `https://notebook-blog-api.onrender.com/api`. If you deploy your own copy, change those addresses to yours, along with `READER_URL` in `author/js/config.js`. If you'd rather keep the two sites fully separate, deploy each folder to its own site on [Netlify](https://www.netlify.com/) or [Cloudflare Pages](https://pages.cloudflare.com/), and add both addresses to `CORS_ORIGINS`.

## Notes

- The author site keeps the token in `localStorage`, as the assignment suggests. Logging out just deletes it. If the token expires, the site sends you back to the log-in page.
- Everything from the API is added to the page as text, never as HTML, so comments can't inject scripts.
- The API uses **Prisma 7** with `prisma.config.js` and the `@prisma/adapter-pg` driver adapter. The Prisma packages are pinned to `7.10.1`, because npm's `latest` tag for the Prisma CLI currently points to an 8.0 release candidate.
