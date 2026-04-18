// Array to store all book objects
const myLibrary = [];

// Book constructor
function Book(title, author, pages, read) {
    this.id = crypto.randomUUID();
    this.title = title;
    this.author = author;
    this.pages = pages;
    this.read = read;
}

// Add toggleRead method to Book prototype
Book.prototype.toggleRead = function() {
    this.read = !this.read;
};

// Function to add a book to the library
function addBookToLibrary(title, author, pages, read) {
    const newBook = new Book(title, author, pages, read);
    myLibrary.push(newBook);
    displayBooks();
}

// Function to remove a book from the library
function removeBook(bookId) {
    const index = myLibrary.findIndex(book => book.id === bookId);
    if (index !== -1) {
        myLibrary.splice(index, 1);
        displayBooks();
    }
}

// Function to toggle read status
function toggleReadStatus(bookId) {
    const book = myLibrary.find(book => book.id === bookId);
    if (book) {
        book.toggleRead();
        displayBooks();
    }
}

// Function to display all books
function displayBooks() {
    const libraryDisplay = document.getElementById('library-display');
    libraryDisplay.innerHTML = '';

    // Show empty state if no books
    if (myLibrary.length === 0) {
        libraryDisplay.innerHTML = `
            <div class="empty-state">
                <h2>📖 Your library is empty</h2>
                <p>Click the "New Book" button to add your first book!</p>
            </div>
        `;
        return;
    }

    // Create a card for each book
    myLibrary.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.classList.add('book-card');
        if (book.read) {
            bookCard.classList.add('read');
        }
        
        // Set data attribute for book ID
        bookCard.setAttribute('data-book-id', book.id);

        bookCard.innerHTML = `
            <h3>${book.title}</h3>
            <p class="author">by ${book.author}</p>
            <p class="pages">${book.pages} pages</p>
            <span class="status ${book.read ? 'read' : 'unread'}">
                ${book.read ? '✓ Read' : 'Not Read Yet'}
            </span>
            <div class="book-actions">
                <button class="btn btn-toggle ${book.read ? '' : 'unread'}" data-action="toggle" data-book-id="${book.id}">
                    ${book.read ? 'Mark Unread' : 'Mark Read'}
                </button>
                <button class="btn btn-danger" data-action="remove" data-book-id="${book.id}">
                    Remove
                </button>
            </div>
        `;

        libraryDisplay.appendChild(bookCard);
    });

    // Add event listeners to buttons
    addBookActionListeners();
}

// Add event listeners to book action buttons
function addBookActionListeners() {
    const toggleButtons = document.querySelectorAll('[data-action="toggle"]');
    const removeButtons = document.querySelectorAll('[data-action="remove"]');

    toggleButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const bookId = e.target.getAttribute('data-book-id');
            toggleReadStatus(bookId);
        });
    });

    removeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const bookId = e.target.getAttribute('data-book-id');
            removeBook(bookId);
        });
    });
}

// DOM elements
const newBookBtn = document.getElementById('new-book-btn');
const bookDialog = document.getElementById('book-dialog');
const bookForm = document.getElementById('book-form');
const cancelBtn = document.getElementById('cancel-btn');

// Open dialog
newBookBtn.addEventListener('click', () => {
    bookDialog.showModal();
});

// Close dialog
cancelBtn.addEventListener('click', () => {
    bookDialog.close();
    bookForm.reset();
});

// Handle form submission
bookForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent default form submission

    // Get form values
    const title = document.getElementById('title').value;
    const author = document.getElementById('author').value;
    const pages = parseInt(document.getElementById('pages').value);
    const read = document.getElementById('read').checked;

    // Add book to library
    addBookToLibrary(title, author, pages, read);

    // Close dialog and reset form
    bookDialog.close();
    bookForm.reset();
});

// Close dialog when clicking outside of it
bookDialog.addEventListener('click', (e) => {
    const dialogDimensions = bookDialog.getBoundingClientRect();
    if (
        e.clientX < dialogDimensions.left ||
        e.clientX > dialogDimensions.right ||
        e.clientY < dialogDimensions.top ||
        e.clientY > dialogDimensions.bottom
    ) {
        bookDialog.close();
        bookForm.reset();
    }
});

// Add some sample books to start with
addBookToLibrary('The Hobbit', 'J.R.R. Tolkien', 295, true);
addBookToLibrary('1984', 'George Orwell', 328, false);
addBookToLibrary('To Kill a Mockingbird', 'Harper Lee', 281, true);
addBookToLibrary('The Great Gatsby', 'F. Scott Fitzgerald', 180, false);

// Initial display
displayBooks();