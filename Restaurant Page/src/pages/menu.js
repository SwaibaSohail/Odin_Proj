function createMenuPage() {
  const content = document.getElementById('content');
  
  // Clear existing content
  content.innerHTML = '';
  
  // Create heading
  const heading = document.createElement('h1');
  heading.textContent = 'Our Menu';
  
  content.appendChild(heading);
  
  // Menu sections
  const sections = [
    {
      title: 'Appetizers',
      items: [
        { name: 'Charred Beet Salad with Sage Oil', price: '$9' },
        { name: 'Smoked Garlic Bread with Herb Butter', price: '$7' },
        { name: 'Fire-Roasted Mushroom & Thyme Crostini', price: '$10' }
      ]
    },
    {
      title: 'Main Courses',
      items: [
        { name: 'Wood-Fired Salmon with Rosemary & Citrus', price: '$32' },
        { name: 'Ember-Charred Ribeye with Sage Brown Butter', price: '$38' },
        { name: 'Herb-Brined Chicken with Smoky Root Vegetables', price: '$26' }
      ]
    },
    {
      title: 'Desserts',
      items: [
        { name: 'Smoked Caramel Panna Cotta', price: '$8' },
        { name: 'Sage & Honey Cheesecake', price: '$9' },
        { name: 'Charred Pineapple with Herb Cream', price: '$8' }
      ]
    }
  ];
  
  // Render menu sections
  sections.forEach((section, sectionIndex) => {
    const sectionHeading = document.createElement('h2');
    sectionHeading.textContent = section.title;
    content.appendChild(sectionHeading);
    
    const itemsContainer = document.createElement('div');
    itemsContainer.style.marginBottom = '2.5rem';
    
    section.items.forEach((item, itemIndex) => {
      const itemDiv = document.createElement('div');
      itemDiv.style.display = 'flex';
      itemDiv.style.justifyContent = 'space-between';
      itemDiv.style.alignItems = 'baseline';
      itemDiv.style.marginBottom = '1.2rem';
      itemDiv.style.paddingBottom = '1.2rem';
      itemDiv.style.borderBottom = '1px solid rgba(212, 165, 116, 0.3)';
      itemDiv.style.animation = `fadeInUp 0.5s ease-out ${0.05 * (sectionIndex * 3 + itemIndex)}s backwards`;
      
      const nameSpan = document.createElement('span');
      nameSpan.textContent = item.name;
      nameSpan.style.fontWeight = '600';
      nameSpan.style.color = '#2d2d2d';
      nameSpan.style.flex = '1';
      
      const priceSpan = document.createElement('span');
      priceSpan.textContent = item.price;
      priceSpan.style.color = '#c84b31';
      priceSpan.style.fontWeight = '700';
      priceSpan.style.marginLeft = '1rem';
      priceSpan.style.whiteSpace = 'nowrap';
      
      itemDiv.appendChild(nameSpan);
      itemDiv.appendChild(priceSpan);
      itemsContainer.appendChild(itemDiv);
    });
    
    content.appendChild(itemsContainer);
  });
}

export default createMenuPage;