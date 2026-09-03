//////// IMPORTS ////////

import { evaluate, DEFAULT_WEIGHTS, isDecisive } from './evaluate.js';
import { expandTurn } from './withinTurn.js';
import { bookMove } from './openingBook.js';
import { isTerminal } from './rules.js';


//////// CONSTANTS ////////

const DEFAULT_MAX_DEPTH = 4;

const DEFAULT_TIME_MS = 4000;

const ROOT_BUDGET = 60000;

const ROOT_KEEP = 16;

const CHILD_KEEP = 6;

const MIN_BUDGET = 1500;

const TABLE_LIMIT = 200000;



//////// UTILITIES ////////

function keyOf(board, turn, depth) {
    let key = turn + '|' + depth + '|';

    for (let i = 1; i <= 16; i++) key += board[i] + ',';

    return key;
}


function opponentOf(turn) {
    return turn === 'P1' ? 'P2' : 'P1';
}


function toNotation(picks, captured) {
    return picks.join('p') + (captured ? 'x' : '');
}



//////// MAIN CONTROL FLOW ////////

function negamax(board, turn, depth, alpha, beta, context) {

    if (isTerminal(board)) return evaluate(board, turn, context.weights);

    if (depth === 0) return evaluate(board, turn, context.weights);

    if (Date.now() > context.deadline) {
        context.aborted = true;
        return evaluate(board, turn, context.weights);
    }

    const key = keyOf(board, turn, depth);
    const cached = context.table.get(key);

    if (cached !== undefined) return cached;

    const budget = Math.max(MIN_BUDGET, Math.floor(context.budget / 4 ** (context.depth - depth)));
    const { outcomes } = expandTurn(board, turn, { budget, keep: CHILD_KEEP, weights: context.weights });

    if (outcomes.length === 0) return evaluate(board, turn, context.weights);

    let best = -Infinity;

    for (const outcome of outcomes) {
        context.nodes++;

        const score = isTerminal(outcome.board)
            ? evaluate(outcome.board, turn, context.weights)
            : -negamax(outcome.board, opponentOf(turn), depth - 1, -beta, -alpha, context);

        if (score > best) best = score;

        if (best > alpha) alpha = best;

        if (alpha >= beta || context.aborted) break;
    }

    if (context.table.size < TABLE_LIMIT) context.table.set(key, best);

    return best;
}


export function chooseMove(board, turn, options = {}) {
    const startedAt = Date.now();
    const booked = bookMove(board, turn);

    if (booked !== null) {
        return {
            kind: 'book',
            cup: booked.cup,
            capture: booked.capture,
            picks: [booked.cup],
            score: null,
            depth: null,
            nodes: 0,
            elapsed: Date.now() - startedAt,
            notation: toNotation([booked.cup], booked.capture),
            remaining: booked.remaining,
        };
    }

    const weights = options.weights ?? DEFAULT_WEIGHTS;
    const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
    const deadline = startedAt + (options.timeMs ?? DEFAULT_TIME_MS);
    const table = new Map();

    const root = expandTurn(board, turn, {
        budget: options.budget ?? ROOT_BUDGET,
        keep: options.keep ?? ROOT_KEEP,
        weights,
    });

    if (root.outcomes.length === 0) return null;

    let best = root.outcomes[0];
    let bestScore = best.score;
    let reached = 0;
    let nodes = 0;

    for (let depth = 1; depth <= maxDepth; depth++) {
        const context = {
            table, weights, deadline, depth,
            budget: options.budget ?? ROOT_BUDGET,
            nodes: 0,
            aborted: false,
        };

        let alpha = -Infinity;
        let candidate = null;

        for (const outcome of root.outcomes) {
            const score = isTerminal(outcome.board)
                ? evaluate(outcome.board, turn, weights)
                : -negamax(outcome.board, opponentOf(turn), depth - 1, -Infinity, -alpha, context);

            if (candidate === null || score > alpha) {
                alpha = score;
                candidate = outcome;
            }

            if (context.aborted) break;
        }

        nodes += context.nodes;

        if (candidate !== null && !context.aborted) {
            best = candidate;
            bestScore = alpha;
            reached = depth;
        }

        if (context.aborted || isDecisive(bestScore)) break;
    }

    return {
        kind: 'search',
        cup: best.picks[0],
        capture: best.captured,
        picks: best.picks,
        score: bestScore,
        depth: reached,
        nodes,
        elapsed: Date.now() - startedAt,
        notation: toNotation(best.picks, best.captured),
        exhausted: root.exhausted,
    };
}