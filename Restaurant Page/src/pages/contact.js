function createContactPage() {
  const content = document.getElementById('content');
  
  // Clear existing content
  content.innerHTML = '';
  
  // Create heading
  const heading = document.createElement('h1');
  heading.textContent = 'Contact Us';
  
  content.appendChild(heading);
  
  // Address section
  const addressHeading = document.createElement('h2');
  addressHeading.textContent = 'Location';
  
  const address = document.createElement('p');
  address.innerHTML = '<strong>Ember & Sage</strong><br>456 Smokehaus Road<br>Flavor District, FD 54321<br>United States';
  address.style.lineHeight = '1.9';
  
  content.appendChild(addressHeading);
  content.appendChild(address);
  
  // Contact info section
  const contactHeading = document.createElement('h2');
  contactHeading.textContent = 'Get in Touch';
  
  const phone = document.createElement('p');
  phone.innerHTML = '<strong style="color: #2d2d2d;">Phone:</strong> (555) 123-4567';
  
  const email = document.createElement('p');
  email.innerHTML = '<strong style="color: #2d2d2d;">Email:</strong> hello@emberandsage.com';
  
  const hours = document.createElement('p');
  hours.innerHTML = `<strong style="color: #2d2d2d;">Hours:</strong><br>
  Monday - Thursday: 11:30 AM - 10:00 PM<br>
  Friday - Saturday: 11:30 AM - 11:00 PM<br>
  Sunday: 12:00 PM - 9:00 PM`;
  hours.style.lineHeight = '1.9';
  
  content.appendChild(contactHeading);
  content.appendChild(phone);
  content.appendChild(email);
  content.appendChild(hours);
  
  // Reservation section
  const reserveHeading = document.createElement('h2');
  reserveHeading.textContent = 'Make a Reservation';
  
  const reserveNote = document.createElement('p');
  reserveNote.textContent = 'Call us or email to reserve your table. We look forward to serving you!';
  
  const reserveBox = document.createElement('div');
  reserveBox.style.marginTop = '1.5rem';
  reserveBox.style.padding = '2rem';
  reserveBox.style.backgroundColor = 'linear-gradient(135deg, rgba(212, 165, 116, 0.1) 0%, rgba(200, 75, 49, 0.05) 100%)';
  reserveBox.style.borderRadius = '6px';
  reserveBox.style.border = '1px solid rgba(212, 165, 116, 0.2)';
  
  const reserveButton = document.createElement('button');
  reserveButton.textContent = 'Call (555) 123-4567';
  reserveButton.style.backgroundColor = '#c84b31';
  reserveButton.style.color = 'white';
  reserveButton.style.border = 'none';
  reserveButton.style.padding = '0.75rem 2rem';
  reserveButton.style.fontSize = '1rem';
  reserveButton.style.fontWeight = '600';
  reserveButton.style.cursor = 'pointer';
  reserveButton.style.borderRadius = '4px';
  reserveButton.style.transition = 'all 0.3s ease';
  reserveButton.style.fontFamily = 'Montserrat, sans-serif';
  reserveButton.style.textTransform = 'uppercase';
  reserveButton.style.letterSpacing = '0.5px';
  
  reserveButton.addEventListener('mouseover', () => {
    reserveButton.style.backgroundColor = '#b83a25';
    reserveButton.style.transform = 'translateY(-2px)';
    reserveButton.style.boxShadow = '0 8px 20px rgba(200, 75, 49, 0.3)';
  });
  
  reserveButton.addEventListener('mouseout', () => {
    reserveButton.style.backgroundColor = '#c84b31';
    reserveButton.style.transform = 'translateY(0)';
    reserveButton.style.boxShadow = 'none';
  });
  
  reserveBox.appendChild(reserveButton);
  
  content.appendChild(reserveHeading);
  content.appendChild(reserveNote);
  content.appendChild(reserveBox);
}

export default createContactPage;