# Mini Message Board

A simple message board built with Express and EJS for The Odin Project NodeJS course.

## Features

- View all messages with author and date on the index page
- Post a new message from the `/new` form
- Open any message to see its details on its own page
- Dark mode that follows your system setting, with a 🌙/☀️ toggle that remembers your choice

## Routes

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/` | List all messages |
| GET | `/new` | New message form |
| POST | `/new` | Add a message and redirect to `/` |
| GET | `/messages/:id` | Message details |

Messages are stored in memory, so they reset when the server restarts.

## Run

```bash
npm install
npm start
```

Then open [http://localhost:3000](http://localhost:3000).
