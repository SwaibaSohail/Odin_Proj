# Odin Projects

A collection of projects built during [The Odin Project](https://www.theodinproject.com/) curriculum.

## Live Demo

[https://swaibasohail.github.io/Odin_Proj/](https://swaibasohail.github.io/Odin_Proj/)

## Projects

| Project | Description |
|---------|-------------|
| [Admin Dashboard](https://swaibasohail.github.io/Odin_Proj/Admin%20dashboard/) | Responsive admin interface with analytics charts |
| [Knights Travails](https://swaibasohail.github.io/Odin_Proj/Knights%20Travails/) | Chess knight shortest path using BFS algorithm |
| [Library](https://swaibasohail.github.io/Odin_Proj/Library/) | Book tracking app with local storage |
| [Sign Up Form](https://swaibasohail.github.io/Odin_Proj/Sign%20up%20form/) | Validation form with real-time password check |
| [To Do List](https://swaibasohail.github.io/Odin_Proj/To%20Do%20list/) | Task manager with projects and due dates |
| [Weather App](https://swaibasohail.github.io/Odin_Proj/Weather%20App/) | Real-time weather data from OpenWeatherMap API |
| [My Landing Page](https://swaibasohail.github.io/Odin_Proj/My_Landing_Page/) | Author tribute page with book gallery |
| [Mini Message Board](https://github.com/SwaibaSohail/Odin_Proj/tree/main/Mini%20Message%20Board) | Express + EJS message board with dark mode (runs locally with Node.js) |
| [Inventory Application](https://github.com/SwaibaSohail/Odin_Proj/tree/main/Inventory%20Application) | Music store inventory with full CRUD, PostgreSQL and admin-protected edits (runs locally with Node.js) |
| [Members Only](https://github.com/SwaibaSohail/Odin_Proj/tree/main/Members%20Only) | Clubhouse message board with Passport log-in, where only members see who wrote each post (runs locally with Node.js) |
| [File Uploader](https://github.com/SwaibaSohail/Odin_Proj/tree/main/File%20Uploader) | Stripped-down Google Drive with folders, uploads and expiring share links (runs locally with Node.js) |
| [Blog API](https://github.com/SwaibaSohail/Odin_Proj/tree/main/Blog%20API) | REST API with JWT log-in, plus separate reader and author websites (runs locally with Node.js) |


## Tech Stack

- HTML5
- CSS3 (Flexbox, Grid, Responsive Design)
- JavaScript ES6+
- Webpack (Restaurant Page)
- LocalStorage API
- REST APIs
- Node.js, Express and EJS (Mini Message Board, Inventory Application, Members Only, File Uploader)
- PostgreSQL (Inventory Application, Members Only, File Uploader, Blog API)
- Passport and bcrypt authentication (Members Only, File Uploader)
- Prisma ORM (File Uploader, Blog API), multer and Supabase Storage (File Uploader)
- REST APIs with JSON Web Tokens (Blog API)


---

## 🏃‍♂️ How to Run Locally

### Prerequisites
- Any modern web browser
- (Optional) Local server like VS Code Live Server
- [Node.js](https://nodejs.org/) for the Mini Message Board, Inventory Application, Members Only, File Uploader and Blog API
- [PostgreSQL](https://www.postgresql.org/download/) for the Inventory Application, Members Only, File Uploader and Blog API

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/SwaibaSohail/Odin_Proj.git
   ```

2. **Open a project**: open any project's `index.html` in your browser.

3. **Run the Mini Message Board** (needs Node.js)
   ```bash
   cd "Odin_Proj/Mini Message Board"
   npm install
   npm start
   ```
   Then open [http://localhost:3000](http://localhost:3000).

4. **Run the Inventory Application** (needs Node.js and PostgreSQL): follow the setup steps in [its README](Inventory%20Application/README.md).

5. **Run Members Only** (needs Node.js and PostgreSQL): follow the setup steps in [its README](Members%20Only/README.md).

6. **Run the File Uploader** (needs Node.js and PostgreSQL): follow the setup steps in [its README](File%20Uploader/README.md).

7. **Run the Blog API** (needs Node.js and PostgreSQL): it's three apps, so follow the steps in [its README](Blog%20API/README.md).
