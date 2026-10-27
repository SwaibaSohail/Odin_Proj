// Where the Blog API is running. On your own computer the site uses the API
// on localhost; anywhere else (like GitHub Pages) it uses the deployed one.
const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);

export const API_URL = local ? "http://localhost:3000/api" : "https://notebook-blog-api.onrender.com/api";
