// Game initialization and DOM elements
const chessboard = document.getElementById('chessboard');
const gameStatus = document.getElementById('gameStatus');
const resetButton = document.getElementById('resetButton');
const capturedWhite = document.getElementById('capturedWhite');
const capturedBlack = document.getElementById('capturedBlack');

// Initial game state
let board = [];
let currentPlayer = 'white';
let selectedPiece = null;
let possibleMoves = [];
let whiteKingPosition = { row: 7, col: 4 };
let blackKingPosition = { row: 0, col: 4 };
let isGameOver = false;
let moveHistory = [];
let capturedPieces = { white: [], black: [] };

// En passant tracking
let enPassantTarget = null;

// Castling rights
let castlingRights = {
    white: { kingSide: true, queenSide: true },
    black: { kingSide: true, queenSide: true }
};

// Track if pieces have moved (for castling)
let pieceMoved = {
    whiteKing: false,
    blackKing: false,
    whiteRookKingSide: false,
    whiteRookQueenSide: false,
    blackRookKingSide: false,
    blackRookQueenSide: false
};

// Piece Unicode symbols
const pieces = {
    'p': '♙', 'r': '♖', 'n': '♘', 'b': '♗', 'q': '♕', 'k': '♔',
    'P': '♟', 'R': '♜', 'N': '♞', 'B': '♝', 'Q': '♛', 'K': '♚'
};

// Board Setup
function setupBoard() {
    board = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];
    
    whiteKingPosition = { row: 7, col: 4 };
    blackKingPosition = { row: 0, col: 4 };
    currentPlayer = 'white';
    selectedPiece = null;
    possibleMoves = [];
    isGameOver = false;
    moveHistory = [];
    enPassantTarget = null;
    capturedPieces = { white: [], black: [] };
    
    castlingRights = {
        white: { kingSide: true, queenSide: true },
        black: { kingSide: true, queenSide: true }
    };
    
    pieceMoved = {
        whiteKing: false,
        blackKing: false,
        whiteRookKingSide: false,
        whiteRookQueenSide: false,
        blackRookKingSide: false,
        blackRookQueenSide: false
    };
    
    renderBoard();
    updateStatus();
    renderCapturedPieces();
}

// Render the board
function renderBoard() {
    chessboard.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            const piece = board[row][col];
            if (piece) {
                const pieceElement = document.createElement('div');
                pieceElement.classList.add('piece');
                pieceElement.classList.add(isWhitePiece(piece) ? 'white' : 'black');
                pieceElement.textContent = pieces[piece];
                pieceElement.dataset.piece = piece;
                cell.appendChild(pieceElement);
            }
            
            cell.addEventListener('click', () => handleCellClick(row, col));
            chessboard.appendChild(cell);
        }
    }
    
    highlightCheck();
}

// Handle cell click
function handleCellClick(row, col) {
    if (isGameOver) return;
    
    const piece = board[row][col];
    
    if (selectedPiece) {
        const isValidMove = possibleMoves.some(move => move.row === row && move.col === col);
        
        if (isValidMove) {
            makeMove(selectedPiece.row, selectedPiece.col, row, col);
            clearSelection();
        } else if (piece && getPieceColor(piece) === currentPlayer) {
            selectPiece(row, col);
        } else {
            clearSelection();
        }
    } else if (piece && getPieceColor(piece) === currentPlayer) {
        selectPiece(row, col);
    }
}

// Select a piece
function selectPiece(row, col) {
    selectedPiece = { row, col, piece: board[row][col] };
    possibleMoves = getLegalMoves(row, col);
    highlightMoves();
}

// Clear selection
function clearSelection() {
    selectedPiece = null;
    possibleMoves = [];
    renderBoard();
}

// Highlight possible moves
function highlightMoves() {
    renderBoard();
    
    if (!selectedPiece) return;
    
    const selectedCell = document.querySelector(
        `[data-row="${selectedPiece.row}"][data-col="${selectedPiece.col}"]`
    );
    if (selectedCell) {
        selectedCell.classList.add('selected');
    }
    
    possibleMoves.forEach(move => {
        const cell = document.querySelector(`[data-row="${move.row}"][data-col="${move.col}"]`);
        if (cell) {
            cell.classList.add('highlight');
            if (board[move.row][move.col]) {
                cell.classList.add('capture');
            }
        }
    });
}

// Make a move
function makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const capturedPiece = board[toRow][toCol];
    
    // Handle en passant capture
    if (piece.toLowerCase() === 'p' && enPassantTarget && 
        toRow === enPassantTarget.row && toCol === enPassantTarget.col) {
        const capturedPawnRow = currentPlayer === 'white' ? toRow + 1 : toRow - 1;
        const capturedPawn = board[capturedPawnRow][toCol];
        board[capturedPawnRow][toCol] = null;
        addCapturedPiece(capturedPawn);
    } else if (capturedPiece) {
        addCapturedPiece(capturedPiece);
    }
    
    // Handle castling
    if (piece.toLowerCase() === 'k' && Math.abs(toCol - fromCol) === 2) {
        if (toCol === 6) {
            // King-side castling
            board[toRow][5] = board[toRow][7];
            board[toRow][7] = null;
        } else if (toCol === 2) {
            // Queen-side castling
            board[toRow][3] = board[toRow][0];
            board[toRow][0] = null;
        }
    }
    
    // Update en passant target
    enPassantTarget = null;
    if (piece.toLowerCase() === 'p' && Math.abs(toRow - fromRow) === 2) {
        enPassantTarget = {
            row: currentPlayer === 'white' ? fromRow - 1 : fromRow + 1,
            col: fromCol
        };
    }
    
    // Handle pawn promotion
    if (piece.toLowerCase() === 'p' && (toRow === 0 || toRow === 7)) {
        board[toRow][toCol] = currentPlayer === 'white' ? 'Q' : 'q';
    } else {
        board[toRow][toCol] = piece;
    }
    
    board[fromRow][fromCol] = null;
    
    // Update king position
    if (piece.toLowerCase() === 'k') {
        if (currentPlayer === 'white') {
            whiteKingPosition = { row: toRow, col: toCol };
            pieceMoved.whiteKing = true;
            castlingRights.white.kingSide = false;
            castlingRights.white.queenSide = false;
        } else {
            blackKingPosition = { row: toRow, col: toCol };
            pieceMoved.blackKing = true;
            castlingRights.black.kingSide = false;
            castlingRights.black.queenSide = false;
        }
    }
    
    // Update castling rights for rooks
    if (piece.toLowerCase() === 'r') {
        if (currentPlayer === 'white') {
            if (fromRow === 7 && fromCol === 7) {
                castlingRights.white.kingSide = false;
            } else if (fromRow === 7 && fromCol === 0) {
                castlingRights.white.queenSide = false;
            }
        } else {
            if (fromRow === 0 && fromCol === 7) {
                castlingRights.black.kingSide = false;
            } else if (fromRow === 0 && fromCol === 0) {
                castlingRights.black.queenSide = false;
            }
        }
    }
    
    moveHistory.push({ fromRow, fromCol, toRow, toCol, piece, capturedPiece });
    
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    
    renderBoard();
    updateStatus();
    renderCapturedPieces();
    
    checkGameEnd();
}

// Get legal moves for a piece
function getLegalMoves(row, col) {
    const piece = board[row][col];
    if (!piece) return [];
    
    let moves = [];
    const pieceType = piece.toLowerCase();
    
    switch (pieceType) {
        case 'p':
            moves = getPawnMoves(row, col);
            break;
        case 'r':
            moves = getRookMoves(row, col);
            break;
        case 'n':
            moves = getKnightMoves(row, col);
            break;
        case 'b':
            moves = getBishopMoves(row, col);
            break;
        case 'q':
            moves = getQueenMoves(row, col);
            break;
        case 'k':
            moves = getKingMoves(row, col);
            break;
    }
    
    // Filter out moves that would put own king in check
    return moves.filter(move => !wouldBeInCheck(row, col, move.row, move.col));
}

// Pawn moves
function getPawnMoves(row, col) {
    const moves = [];
    const piece = board[row][col];
    const isWhite = isWhitePiece(piece);
    const direction = isWhite ? -1 : 1;
    const startRow = isWhite ? 6 : 1;
    
    // Forward move
    if (isValidPosition(row + direction, col) && !board[row + direction][col]) {
        moves.push({ row: row + direction, col });
        
        // Double move from starting position
        if (row === startRow && !board[row + 2 * direction][col]) {
            moves.push({ row: row + 2 * direction, col });
        }
    }
    
    // Diagonal captures
    [-1, 1].forEach(offset => {
        const newRow = row + direction;
        const newCol = col + offset;
        
        if (isValidPosition(newRow, newCol)) {
            const targetPiece = board[newRow][newCol];
            if (targetPiece && getPieceColor(targetPiece) !== getPieceColor(piece)) {
                moves.push({ row: newRow, col: newCol });
            }
            
            // En passant
            if (enPassantTarget && newRow === enPassantTarget.row && newCol === enPassantTarget.col) {
                moves.push({ row: newRow, col: newCol });
            }
        }
    });
    
    return moves;
}

// Rook moves
function getRookMoves(row, col) {
    const moves = [];
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    
    directions.forEach(([dRow, dCol]) => {
        let newRow = row + dRow;
        let newCol = col + dCol;
        
        while (isValidPosition(newRow, newCol)) {
            const targetPiece = board[newRow][newCol];
            
            if (!targetPiece) {
                moves.push({ row: newRow, col: newCol });
            } else {
                if (getPieceColor(targetPiece) !== getPieceColor(board[row][col])) {
                    moves.push({ row: newRow, col: newCol });
                }
                break;
            }
            
            newRow += dRow;
            newCol += dCol;
        }
    });
    
    return moves;
}

// Knight moves
function getKnightMoves(row, col) {
    const moves = [];
    const knightMoves = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    
    knightMoves.forEach(([dRow, dCol]) => {
        const newRow = row + dRow;
        const newCol = col + dCol;
        
        if (isValidPosition(newRow, newCol)) {
            const targetPiece = board[newRow][newCol];
            if (!targetPiece || getPieceColor(targetPiece) !== getPieceColor(board[row][col])) {
                moves.push({ row: newRow, col: newCol });
            }
        }
    });
    
    return moves;
}

// Bishop moves
function getBishopMoves(row, col) {
    const moves = [];
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    
    directions.forEach(([dRow, dCol]) => {
        let newRow = row + dRow;
        let newCol = col + dCol;
        
        while (isValidPosition(newRow, newCol)) {
            const targetPiece = board[newRow][newCol];
            
            if (!targetPiece) {
                moves.push({ row: newRow, col: newCol });
            } else {
                if (getPieceColor(targetPiece) !== getPieceColor(board[row][col])) {
                    moves.push({ row: newRow, col: newCol });
                }
                break;
            }
            
            newRow += dRow;
            newCol += dCol;
        }
    });
    
    return moves;
}

// Queen moves (combination of rook and bishop)
function getQueenMoves(row, col) {
    return [...getRookMoves(row, col), ...getBishopMoves(row, col)];
}

// King moves
function getKingMoves(row, col) {
    const moves = [];
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];
    
    directions.forEach(([dRow, dCol]) => {
        const newRow = row + dRow;
        const newCol = col + dCol;
        
        if (isValidPosition(newRow, newCol)) {
            const targetPiece = board[newRow][newCol];
            if (!targetPiece || getPieceColor(targetPiece) !== getPieceColor(board[row][col])) {
                moves.push({ row: newRow, col: newCol });
            }
        }
    });
    
    // Castling
    const isWhite = isWhitePiece(board[row][col]);
    const rights = isWhite ? castlingRights.white : castlingRights.black;
    
    if (rights.kingSide && !isInCheck(isWhite ? 'white' : 'black')) {
        if (!board[row][5] && !board[row][6] && board[row][7]) {
            if (!isSquareUnderAttack(row, 5, isWhite ? 'white' : 'black') &&
                !isSquareUnderAttack(row, 6, isWhite ? 'white' : 'black')) {
                moves.push({ row, col: 6 });
            }
        }
    }
    
    if (rights.queenSide && !isInCheck(isWhite ? 'white' : 'black')) {
        if (!board[row][1] && !board[row][2] && !board[row][3] && board[row][0]) {
            if (!isSquareUnderAttack(row, 2, isWhite ? 'white' : 'black') &&
                !isSquareUnderAttack(row, 3, isWhite ? 'white' : 'black')) {
                moves.push({ row, col: 2 });
            }
        }
    }
    
    return moves;
}

// Check if move would put own king in check
function wouldBeInCheck(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const capturedPiece = board[toRow][toCol];
    const playerColor = getPieceColor(piece);
    
    // Simulate the move
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;
    
    let kingPos;
    if (piece.toLowerCase() === 'k') {
        kingPos = { row: toRow, col: toCol };
    } else {
        kingPos = playerColor === 'white' ? whiteKingPosition : blackKingPosition;
    }
    
    const inCheck = isSquareUnderAttack(kingPos.row, kingPos.col, playerColor);
    
    // Undo the move
    board[fromRow][fromCol] = piece;
    board[toRow][toCol] = capturedPiece;
    
    return inCheck;
}

// Check if a square is under attack
function isSquareUnderAttack(row, col, defendingColor) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && getPieceColor(piece) !== defendingColor) {
                const moves = getPieceMoves(r, c);
                if (moves.some(move => move.row === row && move.col === col)) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Get piece moves without check validation
function getPieceMoves(row, col) {
    const piece = board[row][col];
    if (!piece) return [];
    
    const pieceType = piece.toLowerCase();
    
    switch (pieceType) {
        case 'p':
            return getPawnMoves(row, col);
        case 'r':
            return getRookMoves(row, col);
        case 'n':
            return getKnightMoves(row, col);
        case 'b':
            return getBishopMoves(row, col);
        case 'q':
            return getQueenMoves(row, col);
        case 'k':
            const moves = [];
            const directions = [
                [-1, -1], [-1, 0], [-1, 1],
                [0, -1], [0, 1],
                [1, -1], [1, 0], [1, 1]
            ];
            
            directions.forEach(([dRow, dCol]) => {
                const newRow = row + dRow;
                const newCol = col + dCol;
                
                if (isValidPosition(newRow, newCol)) {
                    const targetPiece = board[newRow][newCol];
                    if (!targetPiece || getPieceColor(targetPiece) !== getPieceColor(piece)) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
            });
            return moves;
        default:
            return [];
    }
}

// Check if king is in check
function isInCheck(color) {
    const kingPos = color === 'white' ? whiteKingPosition : blackKingPosition;
    return isSquareUnderAttack(kingPos.row, kingPos.col, color);
}

// Highlight king if in check
function highlightCheck() {
    if (isInCheck(currentPlayer)) {
        const kingPos = currentPlayer === 'white' ? whiteKingPosition : blackKingPosition;
        const kingCell = document.querySelector(`[data-row="${kingPos.row}"][data-col="${kingPos.col}"]`);
        if (kingCell) {
            kingCell.classList.add('in-check');
        }
    }
}

// Check for checkmate or stalemate
function checkGameEnd() {
    const hasLegalMoves = hasAnyLegalMoves(currentPlayer);
    
    if (!hasLegalMoves) {
        if (isInCheck(currentPlayer)) {
            const winner = currentPlayer === 'white' ? 'Black' : 'White';
            gameStatus.textContent = `Checkmate! ${winner} wins!`;
            isGameOver = true;
        } else {
            gameStatus.textContent = 'Stalemate! Draw!';
            isGameOver = true;
        }
    } else if (isInCheck(currentPlayer)) {
        gameStatus.textContent = `${currentPlayer === 'white' ? 'White' : 'Black'} is in Check!`;
    }
}

// Check if player has any legal moves
function hasAnyLegalMoves(color) {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && getPieceColor(piece) === color) {
                const legalMoves = getLegalMoves(row, col);
                if (legalMoves.length > 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Helper functions
function isValidPosition(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function isWhitePiece(piece) {
    return piece === piece.toUpperCase();
}

function getPieceColor(piece) {
    return isWhitePiece(piece) ? 'white' : 'black';
}

function addCapturedPiece(piece) {
    const color = getPieceColor(piece);
    capturedPieces[color].push(piece);
}

function renderCapturedPieces() {
    capturedWhite.innerHTML = capturedPieces.white
        .map(p => `<span class="captured-piece white">${pieces[p]}</span>`)
        .join('');
    
    capturedBlack.innerHTML = capturedPieces.black
        .map(p => `<span class="captured-piece black">${pieces[p]}</span>`)
        .join('');
}

function updateStatus() {
    if (!isGameOver) {
        gameStatus.textContent = `${currentPlayer === 'white' ? 'White' : 'Black'}'s Turn`;
    }
}

// Event listeners
resetButton.addEventListener('click', setupBoard);

// Initialize the game
setupBoard();
