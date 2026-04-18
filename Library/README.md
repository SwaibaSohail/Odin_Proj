# 📚 Library Project

A dynamic library management application built with vanilla JavaScript, HTML, and CSS.

## Features

✅ **All Requirements Implemented:**

1. **Book Constructor & Array Storage**
   - Books are created using a constructor function
   - Each book has a unique ID generated with `crypto.randomUUID()`
   - All books stored in `myLibrary` array

2. **Display Function**
   - Books displayed as attractive cards in a responsive grid
   - Automatically updates when books are added/removed
   - Shows empty state when library is empty

3. **Add New Book**
   - Modal dialog using `<dialog>` tag
   - Form with fields for title, author, pages, and read status
   - Uses `event.preventDefault()` to handle form submission properly

4. **Remove Book**
   - Each book card has a "Remove" button
   - Uses `data-book-id` attribute to associate DOM elements with book objects
   - Removes book from array and updates display

5. **Toggle Read Status**
   - Each book has a toggle button to mark as read/unread
   - `Book.prototype.toggleRead()` method implemented
   - Visual indicators show read status (green = read, orange = unread)

## Project Structure

```
library-project/
├── index.html      # Main HTML structure
├── styles.css      # All styling and responsive design
└── script.js       # JavaScript logic and functionality
```

## How to Use

1. Open `index.html` in a web browser
2. Click "+ New Book" to add books to your library
3. Fill in the book details (title, author, pages, read status)
4. Click "Add Book" to save
5. Use "Mark Read/Unread" button to toggle read status
6. Use "Remove" button to delete books from library

## Key JavaScript Concepts Demonstrated

- **Constructor Functions**: `Book()` constructor
- **Prototype Methods**: `Book.prototype.toggleRead()`
- **Array Methods**: `push()`, `splice()`, `find()`, `findIndex()`, `forEach()`
- **DOM Manipulation**: Creating and updating elements dynamically
- **Event Handling**: `addEventListener()`, `preventDefault()`
- **Data Attributes**: Using `data-book-id` to link DOM and data
- **Dialog API**: Modern modal dialogs with `<dialog>` element

## Sample Data

The app comes with 4 sample books pre-loaded to demonstrate functionality:
- The Hobbit (Read)
- 1984 (Unread)
- To Kill a Mockingbird (Read)
- The Great Gatsby (Unread)

## Design Features

- **Responsive Grid Layout**: Adapts to different screen sizes
- **Modern UI**: Gradient background, card-based design, smooth animations
- **Visual Feedback**: Hover effects, color-coded read status
- **Accessible Forms**: Proper labels and semantic HTML
- **Empty State**: Helpful message when library is empty

Enjoy managing your book collection! 📖