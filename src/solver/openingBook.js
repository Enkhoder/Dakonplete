//////// IMPORTS ////////

import { resolvePick, applyCapture, initBoard } from './rules.js';


//////// CONSTANTS ////////

export const OPENING_LINE = '1p2p5p2p1p5p2p2p4p7p2p4p7p3p7p4p6p4p3p6p7p5p6p7p5p7p5p3p5p4p6p7p4p1p2p7p6p7p1p7p5p7p2p7p5p7p3x';

export const OPENING_SCORE = 96;

export const OPENING_PROVEN = false;



//////// UTILITIES ////////

function keyOf(board) {
    let key = '';

    for (let i = 1; i <= 16; i++) key += board[i] + ',';

    return key;
}


const BOOK = (() => {
    const segments = OPENING_LINE.split('p');
    const positions = new Map();
    const board = initBoard();

    for (let i = 0; i < segments.length; i++) {
        const match = segments[i].match(/^(\d+)(x?)$/);
        const cup = parseInt(match[1], 10);
        const capture = match[2] === 'x';

        positions.set(keyOf(board), { cup, capture, remaining: segments.length - i });

        const outcome = resolvePick(board, cup, 'P1');

        if (capture) applyCapture(board, outcome.cup, 'P1');
    }

    return { positions, finalStore: board[15] };
})();



//////// MAIN CONTROL FLOW ////////

export function bookMove(board, turn) {

    if (turn !== 'P1') return null;

    const entry = BOOK.positions.get(keyOf(board));

    if (entry === undefined) return null;

    return { cup: entry.cup, capture: entry.capture, remaining: entry.remaining };
}


export function bookFinalStore() {
    return BOOK.finalStore;
}