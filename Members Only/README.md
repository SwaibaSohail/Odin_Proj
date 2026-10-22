# Members Only

An exclusive clubhouse where members write anonymous posts. Everyone can read the messages, but only members can see who wrote them and when. Built with Express, Passport, bcrypt and PostgreSQL for The Odin Project NodeJS course.

## Features

- Sign up with a first name, last name, email and password. Every field is validated, the password is hashed with bcrypt, and a custom validator checks that "confirm password" matches
- Log in and out with Passport (local strategy). Sessions are stored in PostgreSQL
- New accounts aren't members. Entering the club passcode on the "Join the club" page makes you one
- Logged-in users can post messages, but only members see each message's author and date
- Admins (who enter the admin passcode) can delete messages
- Dates show in each reader's own time zone
- Dark mode that follows your system setting, plus a Dark/Light toggle, and a layout that works on phones

## Who sees what

| | Read messages | See author and date | Post messages | Delete messages |
|---|---|---|---|---|
| Visitor | Yes | No | No | No |
| Logged in, not a member | Yes | No | Yes | No |
| Member | Yes | Yes | Yes | No |
| Admin | Yes | Yes | Yes | Yes |

Non-members never receive the author or date at all, so they can't be found by viewing the page source.

## Database design

```
users                                messages
-------------------------            -----------------------
id             PK                    id           PK
first_name                           title
last_name                            body
email          unique (any case)     created_at
password_hash  bcrypt                user_id      FK -> users.id
is_member      default false
is_admin       default false
created_at
```

- A user can write many messages, and every message belongs to one user. Deleting a user also deletes their messages.
- Becoming an admin also makes you a member, because admins can see everything.
- Log-in sessions are kept in a `session` table, so you stay logged in when the server restarts.

## Routes

| Method | URL | Who | Description |
|--------|-----|-----|-------------|
| GET | `/` | Everyone | Message board |
| GET/POST | `/sign-up` | Logged out | Create an account |
| GET/POST | `/log-in` | Logged out | Log in |
| POST | `/log-out` | Logged in | Log out |
| GET/POST | `/join` | Logged in | Enter the club passcode to become a member |
| GET/POST | `/admin` | Logged in | Enter the admin passcode to become an admin |
| GET/POST | `/messages/new` | Logged in | Write a message |
| POST | `/messages/:id/delete` | Admins | Delete a message |

## Run locally

You need [Node.js](https://nodejs.org/) and [PostgreSQL](https://www.postgresql.org/download/).

1. Create a database and user in `psql`:
   ```sql
   CREATE USER members_user WITH PASSWORD 'members_pass';
   CREATE DATABASE members_only OWNER members_user;
   ```
2. Copy `.env.example` to `.env` and change the values if you like:
   ```
   DATABASE_URL=postgresql://members_user:members_pass@localhost:5432/members_only
   SESSION_SECRET=replace-this-with-a-long-random-string
   MEMBER_PASSCODE=knock-knock
   ADMIN_PASSCODE=master-key
   PORT=3000
   ```
3. Install, add the dummy data and start the server:
   ```bash
   npm install
   npm run seed
   npm start
   ```
4. Open [http://localhost:3000](http://localhost:3000).

`npm run seed` creates these accounts, all with the password `clubhouse123` (or `SEED_PASSWORD` from `.env` if you set it):

| Email | Role |
|-------|------|
| `admin@example.com` | Admin |
| `member@example.com` | Member |
| `guest@example.com` | Not a member |

> `npm run seed` **resets** the database: it drops the tables (which also logs everyone out), recreates them and adds the dummy data.

## Deploy

1. Create a hosted PostgreSQL database, for example on [Neon](https://neon.tech/).
2. Set `SEED_PASSWORD` in your `.env` to something private, so the live admin account doesn't use the public default. Then add the dummy data from your computer:
   ```bash
   npm run seed -- "<your hosted DATABASE_URL>"
   ```
3. Deploy this folder to a Node host such as [Render](https://render.com/) or [Railway](https://railway.com/):
   - Root directory: `Members Only`
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment variables: `DATABASE_URL`, `SESSION_SECRET`, `MEMBER_PASSCODE`, `ADMIN_PASSCODE` and `NODE_ENV=production` (which makes the session cookie HTTPS-only)

To make a strong `SESSION_SECRET`, run:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
