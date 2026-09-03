//////// CONSTANTS ////////

export const TRAVERSAL = [1, 2, 3, 4, 5, 6, 7, 15, 8, 9, 10, 11, 12, 13, 14, 16];

export const TOTAL_SEEDS = 98;

export const P1_STORE = 15;

export const P2_STORE = 16;



//////// UTILITIES ////////

function buildNextTable(turn) {
    const table = new Int8Array(17);
    const skip = turn === 'P1' ? P2_STORE : P1_STORE;

    for (let i = 0; i < TRAVERSAL.length; i++) {
        let ni = (i + 1) % TRAVERSAL.length;

        if (TRAVERSAL[ni] === skip) ni = (ni + 1) % TRAVERSAL.length;

        table[TRAVERSAL[i]] = TRAVERSAL[ni];
    }

    return table;
}


const NEXT = { P1: buildNextTable('P1'), P2: buildNextTable('P2') };


export function getNext(cur, turn) {
    return NEXT[turn][cur];
}


export function initBoard() {
    const board = new Int32Array(17);

    for (let i = 1; i <= 14; i++) board[i] = 7;

    return board;
}


export function storeOf(turn) {
    return turn === 'P1' ? P1_STORE : P2_STORE;
}


export function hasMove(board, turn) {
    const lo = turn === 'P1' ? 1 : 8;

    for (let i = lo; i < lo + 7; i++) {

        if (board[i] > 0) return true;
    }

    return false;
}


export function isTerminal(board) {
    return board[P1_STORE] + board[P2_STORE] === TOTAL_SEEDS
        || !hasMove(board, 'P1')
        || !hasMove(board, 'P2');
}



//////// MAIN CONTROL FLOW ////////

export function resolvePick(board, startCup, turn) {
    const next = NEXT[turn];
    const ownStore = storeOf(turn);
    let cup = startCup;

    while (true) {
        const count = board[cup];

        if (count === 0) return { kind: 'END' };

        board[cup] = 0;
        let cur = cup;
        let lastWasEmpty = false;

        for (let i = 0; i < count; i++) {
            cur = next[cur];

            if (i === count - 1) lastWasEmpty = board[cur] === 0;

            board[cur]++;
        }

        if (cur === ownStore) return { kind: 'FREE' };

        if (cur >= 1 && cur <= 14) {

            if (!lastWasEmpty) {
                cup = cur;
                continue;
            }

            const ownSide = (turn === 'P1' && cur <= 7) || (turn === 'P2' && cur >= 8);

            if (ownSide && board[15 - cur] > 0) return { kind: 'CAP', cup: cur };
        }

        return { kind: 'END' };
    }
}


export function applyCapture(board, cup, turn) {
    const mirror = 15 - cup;

    board[storeOf(turn)] += board[cup] + board[mirror];
    board[cup] = 0;
    board[mirror] = 0;
}