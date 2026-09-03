//////// IMPORTS ////////

import { isTerminal, storeOf } from './rules.js';


//////// CONSTANTS ////////

const CIRCUIT = 15;

const WIN_SCORE = 10000;

export const DEFAULT_WEIGHTS = {
    storeDiff: 1,
    seedsDiff: 1,
    freePicks: 1,
    captureThreat: 1,
    captureVulnerability: -1,
    boardControl: 1,
    starvation: -1,
};



//////// UTILITIES ////////

function rangeOf(turn) {
    return turn === 'P1' ? [1, 7] : [8, 14];
}


function stepsToStore(cup, turn) {
    return turn === 'P1' ? 8 - cup : 15 - cup;
}


function landsInOwnStore(seeds, cup, turn) {
    const steps = stepsToStore(cup, turn);

    return seeds >= steps && (seeds - steps) % CIRCUIT === 0;
}



//////// MAIN CONTROL FLOW ////////

export function features(board, turn) {
    const opponent = turn === 'P1' ? 'P2' : 'P1';
    const [ownLo, ownHi] = rangeOf(turn);
    const [oppLo, oppHi] = rangeOf(opponent);

    let ownSeeds = 0;
    let oppSeeds = 0;
    let freePicks = 0;
    let captureThreat = 0;
    let captureVulnerability = 0;
    let boardControl = 0;

    for (let cup = ownLo; cup <= ownHi; cup++) {
        const seeds = board[cup];
        ownSeeds += seeds;

        if (seeds > 0) boardControl++;

        if (seeds > 0 && landsInOwnStore(seeds, cup, turn)) freePicks++;

        if (seeds === 0 && board[15 - cup] > 0) captureThreat += board[15 - cup];
    }

    for (let cup = oppLo; cup <= oppHi; cup++) {
        oppSeeds += board[cup];

        if (board[cup] === 0 && board[15 - cup] > 0) captureVulnerability += board[15 - cup];
    }

    return {
        storeDiff: board[storeOf(turn)] - board[storeOf(opponent)],
        seedsDiff: ownSeeds - oppSeeds,
        freePicks,
        captureThreat,
        captureVulnerability,
        boardControl,
        starvation: ownSeeds < 4 ? 4 - ownSeeds : 0,
    };
}


export function evaluate(board, turn, weights = DEFAULT_WEIGHTS) {
    const opponent = turn === 'P1' ? 'P2' : 'P1';
    const margin = board[storeOf(turn)] - board[storeOf(opponent)];

    if (isTerminal(board)) {

        if (margin > 0) return WIN_SCORE + margin;

        if (margin < 0) return -WIN_SCORE + margin;

        return 0;
    }

    const scored = features(board, turn);
    let total = 0;

    for (const key of Object.keys(DEFAULT_WEIGHTS)) total += (weights[key] ?? 0) * scored[key];

    return total;
}


export function isDecisive(score) {
    return Math.abs(score) >= WIN_SCORE - 200;
}


export function terminalMargin(board, turn) {
    const opponent = turn === 'P1' ? 'P2' : 'P1';

    return board[storeOf(turn)] - board[storeOf(opponent)];
}