function knightMoves(start, end) {
    // All possible knight moves
    const moves = [
        [2, 1], [2, -1], [-2, 1], [-2, -1],
        [1, 2], [1, -2], [-1, 2], [-1, -2]
    ];

    // Checks if a position is valid on the 8x8 board
    function isValid(x, y) {
        return x >= 0 && x < 8 && y >= 0 && y < 8;
    }

    // BFS to find shortest path
    function bfs(start, end) {
        const queue = [[start, [start]]];
        const visited = new Set();
        visited.add(start.toString());

        while (queue.length > 0) {
            const [current, path] = queue.shift();
            const [x, y] = current;

            // If reached the destination, return the path
            if (x === end[0] && y === end[1]) {
                return path;
            }

            // Explore all possible knight moves
            for (const [dx, dy] of moves) {
                const newX = x + dx;
                const newY = y + dy;
                const newPos = [newX, newY];
                const posKey = newPos.toString();

                // If valid and not visited, add to queue
                if (isValid(newX, newY) && !visited.has(posKey)) {
                    visited.add(posKey);
                    queue.push([newPos, [...path, newPos]]);
                }
            }
        }

        return null; 
    }

    const path = bfs(start, end);

    console.log(`=> You made it in ${path.length - 1} moves! Here's your path:`);
    path.forEach(pos => console.log(`  [${pos[0]},${pos[1]}]`));

    return path;
}

// Test cases
console.log("Test 1: knightMoves([0,0],[1,2])");
knightMoves([0, 0], [1, 2]);

console.log("\nTest 2: knightMoves([0,0],[3,3])");
knightMoves([0, 0], [3, 3]);

console.log("\nTest 3: knightMoves([3,3],[0,0])");
knightMoves([3, 3], [0, 0]);

console.log("\nTest 4: knightMoves([0,0],[7,7])");
knightMoves([0, 0], [7, 7]);

console.log("\nTest 5: knightMoves([3,3],[4,3])");
knightMoves([3, 3], [4, 3]);