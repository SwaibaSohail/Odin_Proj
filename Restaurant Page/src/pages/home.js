function createHomePage() {
  const content = document.getElementById('content');
  
  // Clear existing content
  content.innerHTML = '';
  
  // Create and add elements
  const heading = document.createElement('h1');
  heading.textContent = 'Ember & Sage';
  
  const tagline = document.createElement('p');
  tagline.style.fontSize = '1.2rem';
  tagline.style.color = '#c84b31';
  tagline.style.fontWeight = '500';
  tagline.style.marginBottom = '2rem';
  tagline.style.fontStyle = 'italic';
  tagline.textContent = 'Where Fire Meets Herb, Tradition Meets Innovation';
  
  const description = document.createElement('p');
  description.textContent = `Step into Ember & Sage, where fire-kissed culinary traditions meet 
  aromatic herb-forward innovation. Our kitchen celebrates the bold flavors of wood-fire cooking and 
  artisanal spice blending. Every plate tells a story of heritage and passion—from smoky charred vegetables 
  to perfectly seared meats infused with our house-made sage-herb compound. Experience dining where 
  smoke, flavor, and warmth collide in perfect harmony.`;
  
  const subheading = document.createElement('h2');
  subheading.textContent = 'Hours of Operation';
  
  const hours = document.createElement('p');
  hours.textContent = 'Lunch: 11:30 AM - 2:30 PM | Dinner: 6:00 PM - 10:00 PM';
  hours.style.fontWeight = '600';
  
  const highlight = document.createElement('p');
  highlight.style.marginTop = '2rem';
  highlight.style.padding = '1.5rem';
  highlight.style.backgroundColor = 'rgba(212, 165, 116, 0.1)';
  highlight.style.borderLeft = '4px solid #c84b31';
  highlight.style.borderRadius = '4px';
  highlight.style.fontStyle = 'italic';
  highlight.textContent = '✨ Discover our seasonal menu featuring locally-sourced ingredients and house-made specialties. Reservations recommended for dinner.';
  
  content.appendChild(heading);
  content.appendChild(tagline);
  content.appendChild(description);
  content.appendChild(subheading);
  content.appendChild(hours);
  content.appendChild(highlight);
}

export default createHomePage;