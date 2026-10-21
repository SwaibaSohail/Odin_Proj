# Inventory Application

An inventory manager for **Riff & Rhythm**, an imaginary musical instrument store. Built with Express, EJS and PostgreSQL for The Odin Project NodeJS course.

## Features

- Browse categories on the home page, with stock stats for the whole store
- Open a category to see every item in it, with price, quantity and stock status
- Full CRUD (create, read, update, delete) for both categories and items
- Form validation with clear error messages that keep what you typed
- Editing and deleting require a secret admin password (extra credit)
- Clean "back office" design that works on phones, with dark mode that follows your system setting plus a Dark/Light toggle

## Database design

```
categories                         items
-----------                        -----------------------
id           PK                    id           PK
name         unique (any case)     name
description                        brand
                                   description
                                   price        >= 0
                                   quantity     >= 0
                                   category_id  FK -> categories.id
                                   created_at
```

- Each category has many items, and every item belongs to exactly one category.
- **Deleting a category:** a category can only be deleted once it's empty. The foreign key uses `ON DELETE RESTRICT`, and the delete page lists the remaining items with links to move or delete them. This avoids losing items by accident.
- Prices and quantities can't go below 0 (enforced by `CHECK` constraints and form validation).

## Routes

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/` | Home page with all categories |
| GET/POST | `/categories/new` | Create a category |
| GET | `/categories/:id` | Items in a category |
| GET/POST | `/categories/:id/edit` | Update a category (admin password) |
| GET/POST | `/categories/:id/delete` | Delete an empty category (admin password) |
| GET | `/items` | All items |
| GET/POST | `/items/new` | Create an item (`?category=ID` preselects a category) |
| GET | `/items/:id` | Item details |
| GET/POST | `/items/:id/edit` | Update an item (admin password) |
| GET/POST | `/items/:id/delete` | Delete an item (admin password) |

## Run locally

You need [Node.js](https://nodejs.org/) and [PostgreSQL](https://www.postgresql.org/download/).

1. Create a database and user in `psql`:
   ```sql
   CREATE USER inventory_user WITH PASSWORD 'inventory_pass';
   CREATE DATABASE inventory OWNER inventory_user;
   ```
2. Copy `.env.example` to `.env` and change the values if needed:
   ```
   DATABASE_URL=postgresql://inventory_user:inventory_pass@localhost:5432/inventory
   ADMIN_PASSWORD=changeme
   PORT=3000
   ```
3. Install, add the dummy data and start the server:
   ```bash
   npm install
   npm run seed
   npm start
   ```
4. Open [http://localhost:3000](http://localhost:3000). Use your `ADMIN_PASSWORD` to edit or delete anything.

> `npm run seed` **resets** the database: it drops the tables, recreates them and adds the dummy data.

## Deploy

1. Create a hosted PostgreSQL database (for example on [Neon](https://neon.tech/) or your host's own Postgres).
2. Add the dummy data to it from your computer:
   ```bash
   npm run seed -- "<your hosted DATABASE_URL>"
   ```
3. Deploy this folder to a Node host such as [Render](https://render.com/) or [Railway](https://railway.com/):
   - Root directory: `Inventory Application`
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment variables: `DATABASE_URL` and `ADMIN_PASSWORD`
