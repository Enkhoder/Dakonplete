//////// IMPORTS ////////

import { resolvePick, applyCapture, storeOf, hasMove } from './rules.js';
import { evaluate, DEFAULT_WEIGHTS } from './evaluate.js';


//////// CONSTANTS ////////

const DEFAULT_BUDGET = 120000;

const DEFAULT_KEEP = 24;



//////// UTILITIES ////////

function keyOf(board) {
    let key = '';

    for (let i = 1; i <= 16; i++) key += board[i] + ',';

    return key;
}


function cupRange(turn) {
    return turn === 'P1' ? [1, 7] : [8, 14];
}



//////// MAIN CONTROL FLOW ////////

export function expandTurn(board, turn, options = {}) {
    const budget = options.budget ?? DEFAULT_BUDGET;
    const keep = options.keep ?? DEFAULT_KEEP;
    const weights = options.weights ?? DEFAULT_WEIGHTS;
    const [lo, hi] = cupRange(turn);
    const ownStore = storeOf(turn);

    const outcomes = new Map();
    const visited = new Set();
    const picks = [];
    let nodes = 0;
    let recorded = 0;
    let exhausted = true;

    const prune = () => {
        const ranked = Array.from(outcomes.entries()).sort((a, b) => b[1].score - a[1].score);
        outcomes.clear();

        for (const [key, outcome] of ranked.slice(0, keep * 4)) outcomes.set(key, outcome);
    };

    const record = (result, captured) => {
        const key = keyOf(result);
        const existing = outcomes.get(key);

        if (existing !== undefined && existing.picks.length <= picks.length) return;

        outcomes.set(key, {
            picks: picks.slice(),
            captured,
            board: Int32Array.from(result),
            score: evaluate(result, turn, weights),
        });

        recorded++;

        if (outcomes.size > keep * 16) prune();
    };

    const visit = (current) => {

        if (nodes >= budget) {
            exhausted = false;
            return;
        }

        const key = keyOf(current);

        if (visited.has(key)) return;

        visited.add(key);
        nodes++;

        const branches = [];

        for (let cup = lo; cup <= hi; cup++) {

            if (current[cup] === 0) continue;

            const next = Int32Array.from(current);
            const outcome = resolvePick(next, cup, turn);
            branches.push({ cup, next, outcome });
        }

        branches.sort((a, b) => b.next[ownStore] - a.next[ownStore]);

        for (const branch of branches) {
            picks.push(branch.cup);

            if (branch.outcome.kind === 'CAP') {
                record(branch.next, false);

                const captured = Int32Array.from(branch.next);
                applyCapture(captured, branch.outcome.cup, turn);
                record(captured, true);
            }

            else if (branch.outcome.kind === 'FREE' && hasMove(branch.next, turn)) {
                visit(branch.next);
            }

            else {
                record(branch.next, false);
            }

            picks.pop();

            if (nodes >= budget) {
                exhausted = false;
                break;
            }
        }
    };

    visit(Int32Array.from(board));

    const ranked = Array.from(outcomes.values()).sort((a, b) => b.score - a.score);

    return { outcomes: ranked.slice(0, keep), nodes, exhausted, total: recorded };
}


export function bestTurn(board, turn, options = {}) {
    const { outcomes, nodes, exhausted } = expandTurn(board, turn, options);

    return { best: outcomes[0] ?? null, nodes, exhausted };
}