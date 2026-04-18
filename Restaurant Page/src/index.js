import createHomePage from './pages/home';
import createMenuPage from './pages/menu';
import createContactPage from './pages/contact';

// Define the pages
const pages = {
  home: {
    name: 'Home',
    module: createHomePage
  },
  menu: {
    name: 'Menu',
    module: createMenuPage
  },
  contact: {
    name: 'Contact',
    module: createContactPage
  }
};

// Initialize the site
function initSite() {
  // Create navigation buttons
  const navbar = document.getElementById('navbar');
  
  Object.keys(pages).forEach(pageKey => {
    const button = document.createElement('button');
    button.textContent = pages[pageKey].name;
    button.className = pageKey === 'home' ? 'active' : '';
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('active');
      });
      // Add active class to clicked button
      button.classList.add('active');
      // Load the page
      pages[pageKey].module();
    });
    navbar.appendChild(button);
  });
  
  // Load home page by default
  createHomePage();
}

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', initSite);

console.log('Restaurant website loaded!');