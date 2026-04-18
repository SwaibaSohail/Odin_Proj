// Knight's Travails - Interactive Implementation

class KnightMoves {
    constructor() {
        // All possible knight moves (L-shaped)
        this.moves = [
            [2, 1], [2, -1], [-2, 1], [-2, -1],
            [1, 2], [1, -2], [-1, 2], [-1, -2]
        ];
    }

    isValid(x, y) {
        return x >= 0 && x < 8 && y >= 0 && y < 8;
    }

    findPath(start, end) {
        const queue = [[start, [start]]];
        const visited = new Set();
        visited.add(start.toString());

        while (queue.length > 0) {
            const [current, path] = queue.shift();
            const [x, y] = current;

            // Found the destination
            if (x === end[0] && y === end[1]) {
                return path;
            }

            // Explore all possible knight moves
            for (const [dx, dy] of this.moves) {
                const newX = x + dx;
                const newY = y + dy;
                const newPos = [newX, newY];
                const posKey = newPos.toString();

                if (this.isValid(newX, newY) && !visited.has(posKey)) {
                    visited.add(posKey);
                    queue.push([newPos, [...path, newPos]]);
                }
            }
        }

        return null;
    }
}

class ChessboardUI {
    constructor() {
        this.board = document.getElementById('chessboard');
        this.pathOutput = document.getElementById('pathOutput');
        this.knightMoves = new KnightMoves();
        this.currentPath = null;
        
        this.init();
    }

    init() {
        this.createBoard();
        this.attachEventListeners();
    }

    createBoard() {
        this.board.innerHTML = '';
        
        // Create 8x8 grid (row 7 to 0, col 0 to 7)
        for (let row = 7; row >= 0; row--) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = 'square';
                square.dataset.row = row;
                square.dataset.col = col;
                
                // Alternate light and dark squares
                if ((row + col) % 2 === 0) {
                    square.classList.add('light');
                } else {
                    square.classList.add('dark');
                }
                
                // Click handler for setting positions
                square.addEventListener('click', () => this.handleSquareClick(col, row));
                
                this.board.appendChild(square);
            }
        }
    }

    handleSquareClick(col, row) {
        const startX = document.getElementById('startX');
        const startY = document.getElementById('startY');
        const endX = document.getElementById('endX');
        const endY = document.getElementById('endY');
        
        // Toggle between setting start and end position
        if (startX.value == col && startY.value == row) {
            // If clicking the start position, set end instead
            endX.value = col;
            endY.value = row;
        } else if (endX.value == col && endY.value == row) {
            // If clicking the end position, set start instead
            startX.value = col;
            startY.value = row;
        } else {
            // Set start position
            startX.value = col;
            startY.value = row;
        }
        
        this.updateBoard();
    }

    attachEventListeners() {
        const findPathBtn = document.getElementById('findPathBtn');
        const clearBtn = document.getElementById('clearBtn');
        const inputs = document.querySelectorAll('.coord-input');

        findPathBtn.addEventListener('click', () => this.findAndDisplayPath());
        clearBtn.addEventListener('click', () => this.clearBoard());
        
        inputs.forEach(input => {
            input.addEventListener('change', () => this.updateBoard());
            input.addEventListener('input', () => this.updateBoard());
        });
    }

    updateBoard() {
        const startX = parseInt(document.getElementById('startX').value);
        const startY = parseInt(document.getElementById('startY').value);
        const endX = parseInt(document.getElementById('endX').value);
        const endY = parseInt(document.getElementById('endY').value);

        // Clear all special classes
        const squares = document.querySelectorAll('.square');
        squares.forEach(sq => {
            sq.classList.remove('start', 'end', 'path');
            sq.innerHTML = '';
        });

        // Mark start and end positions
        if (this.isValidCoordinate(startX, startY)) {
            const startSquare = this.getSquare(startX, startY);
            if (startSquare) {
                startSquare.classList.add('start');
                startSquare.innerHTML = '<span class="knight">♞</span>';
            }
        }

        if (this.isValidCoordinate(endX, endY)) {
            const endSquare = this.getSquare(endX, endY);
            if (endSquare) {
                endSquare.classList.add('end');
                if (!(startX === endX && startY === endY)) {
                    endSquare.innerHTML = '<span class="knight">♞</span>';
                }
            }
        }
    }

    findAndDisplayPath() {
        const startX = parseInt(document.getElementById('startX').value);
        const startY = parseInt(document.getElementById('startY').value);
        const endX = parseInt(document.getElementById('endX').value);
        const endY = parseInt(document.getElementById('endY').value);

        if (!this.isValidCoordinate(startX, startY) || 
            !this.isValidCoordinate(endX, endY)) {
            this.displayError('Invalid coordinates. Please enter values between 0 and 7.');
            return;
        }

        const start = [startX, startY];
        const end = [endX, endY];

        const path = this.knightMoves.findPath(start, end);

        if (path) {
            this.currentPath = path;
            this.displayPath(path);
            this.animatePath(path);
        } else {
            this.displayError('No path found!');
        }
    }

    animatePath(path) {
        // Clear previous path display
        const squares = document.querySelectorAll('.square');
        squares.forEach(sq => {
            sq.classList.remove('path');
            const stepNum = sq.querySelector('.step-number');
            if (stepNum) stepNum.remove();
        });

        // Animate path squares with delay
        path.forEach((pos, index) => {
            setTimeout(() => {
                const [x, y] = pos;
                const square = this.getSquare(x, y);
                
                if (square && index > 0 && index < path.length - 1) {
                    square.classList.add('path');
                    
                    // Add step number
                    const stepNumber = document.createElement('span');
                    stepNumber.className = 'step-number';
                    stepNumber.textContent = index;
                    square.appendChild(stepNumber);
                }
            }, index * 150);
        });
    }

    displayPath(path) {
        const moves = path.length - 1;
        
        const resultHTML = `
            <div class="path-result">
                <h2 class="result-header">
                    You made it in ${moves} move${moves !== 1 ? 's' : ''}!
                </h2>
                <div class="path-list">
                    ${path.map((pos, index) => {
                        const arrow = index < path.length - 1 
                            ? '<span class="arrow">→</span>' 
                            : '';
                        return `
                            <span class="path-coordinate" style="animation-delay: ${index * 0.1}s">
                                [${pos[0]}, ${pos[1]}]
                            </span>
                            ${arrow}
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        
        this.pathOutput.innerHTML = resultHTML;
    }

    displayError(message) {
        this.pathOutput.innerHTML = `
            <div class="path-result">
                <h2 class="result-header" style="color: var(--end);">
                    ${message}
                </h2>
            </div>
        `;
    }

    clearBoard() {
        // Clear path visualization
        const squares = document.querySelectorAll('.square');
        squares.forEach(sq => {
            sq.classList.remove('path');
            const stepNum = sq.querySelector('.step-number');
            if (stepNum) stepNum.remove();
        });

        // Reset output
        this.pathOutput.innerHTML = `
            <div class="output-placeholder">
                <svg class="knight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 2L8 6h3v4H8l-2 3h4v7h4v-7h4l-2-3h-3V6h3l-4-4z"/>
                </svg>
                <p>Select positions and find the optimal path</p>
            </div>
        `;

        this.currentPath = null;
        this.updateBoard();
    }

    getSquare(col, row) {
        return document.querySelector(`.square[data-col="${col}"][data-row="${row}"]`);
    }

    isValidCoordinate(x, y) {
        return !isNaN(x) && !isNaN(y) && x >= 0 && x < 8 && y >= 0 && y < 8;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const app = new ChessboardUI();
    
    // Set initial board state
    app.updateBoard();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('findPathBtn').click();
        } else if (e.key === 'Escape') {
            document.getElementById('clearBtn').click();
        }
    });
    
    console.log('🏇 Knight\'s Travails loaded successfully!');
    console.log('💡 Tip: Press Enter to find path, Escape to clear');
});