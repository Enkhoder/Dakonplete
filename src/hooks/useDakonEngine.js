//////// IMPORTS ////////

import { useGameStore } from '../store/gameStore';



//////// CONSTANTS AND UTILITIES ////////

const TRAVERSAL = [1, 2, 3, 4, 5, 6, 7, 15, 8, 9, 10, 11, 12, 13, 14, 16];

const getNext = (cur, turn) => {
    const idx = TRAVERSAL.indexOf(cur);
    let ni = (idx + 1) % 16;
    let next = TRAVERSAL[ni];

    if (turn === 'P1' && next === 16) next = TRAVERSAL[(ni + 1) % 16];

    if (turn === 'P2' && next === 15) next = TRAVERSAL[(ni + 1) % 16];

    return next;
};


const wait = (ms) => new Promise(r => setTimeout(r, ms));


function checkAbort() {

    if (useGameStore.getState().resetRequested) {
        useGameStore.getState().resetGame();
        return true;
    }

    return false;
}


function switchWithEmptyCheck(board, curTurn) {
    const nextTurn = curTurn === 'P1' ? 'P2' : 'P1';
    const [cLo, cHi] = curTurn === 'P1' ? [1, 7] : [8, 14];
    const [nLo, nHi] = nextTurn === 'P1' ? [1, 7] : [8, 14];
    const curHas = board.slice(cLo, cHi + 1).some(v => v > 0);
    const nextHas = board.slice(nLo, nHi + 1).some(v => v > 0);

    if (!curHas || !nextHas) {
        useGameStore.getState().appendTurnNotation('#');
        useGameStore.getState().commitTurnNotation();
        useGameStore.getState().setGameState('GAME_OVER');
        return;
    }

    useGameStore.getState().commitTurnNotation();
    useGameStore.getState().setTurn(nextTurn);
    useGameStore.getState().setGameState('IDLE');
}



//////// MAIN CONTROL FLOW ////////

export function isLegalPick(cup) {
    const s = useGameStore.getState();

    if (s.gameState !== 'IDLE' && s.gameState !== 'FREE_PICK') return false;

    if (cup < 1 || cup > 14 || s.board[cup] === 0) return false;

    return (s.turn === 'P1' && cup <= 7) || (s.turn === 'P2' && cup >= 8);
}


export async function playTurn(startCup) {
    const s = useGameStore.getState();

    if (s.gameState !== 'IDLE' && s.gameState !== 'FREE_PICK') return;

    s.pushUndo();
    s.appendTurnNotation(startCup.toString());
    s.setGameState('ANIMATING');
    s.incMoves();

    const board = [...s.board];
    const seeds = s.seeds.map(x => ({ ...x }));
    const turn = s.turn;

    const spd = () => useGameStore.getState().speed;
    const fast = () => spd() === 0;
    const apply = () =>
        useGameStore.getState().applyState([...board], seeds.map(x => ({ ...x })));

    let cup = startCup;

    while (true) {
        const count = board[cup];

        if (count === 0) break;

        board[cup] = 0;
        const hand = seeds.filter(x => x.cup === cup);
        hand.forEach(x => { x.cup = -1; });

        if (!fast()) {
            const interDelay = Math.min(300, spd() * 1.5);
            apply();
            await wait(interDelay);

            if (checkAbort()) return;

            await wait(interDelay);

            if (checkAbort()) return;
        }

        let cur = cup;
        let lastWasEmpty = false;

        for (let i = 0; i < count; i++) {
            cur = getNext(cur, turn);

            if (i === count - 1) lastWasEmpty = board[cur] === 0;

            board[cur]++;
            hand[i].cup = cur;

            if (!fast()) {
                apply();
                await wait(spd());

                if (checkAbort()) return;
            }
        }

        const ownStore =
            (turn === 'P1' && cur === 15) || (turn === 'P2' && cur === 16);

        if (ownStore) {
            apply();
            useGameStore.getState().appendTurnNotation('p');
            const [lo, hi] = turn === 'P1' ? [1, 7] : [8, 14];
            const hasValid = board.slice(lo, hi + 1).some(v => v > 0);

            if (!hasValid) {
                useGameStore.getState().appendTurnNotation('#');
                useGameStore.getState().commitTurnNotation();
                useGameStore.getState().setGameState('GAME_OVER');
                return;
            }

            useGameStore.getState().setGameState('FREE_PICK');
            return;
        }

        if (cur >= 1 && cur <= 14) {

            if (!lastWasEmpty) {
                cup = cur;
                continue;
            }

            const ownCup =
                (turn === 'P1' && cur <= 7) || (turn === 'P2' && cur >= 8);

            if (ownCup) {
                const mirror = 15 - cur;

                if (board[mirror] > 0) {
                    apply();
                    useGameStore.getState().setPending(cur);

                    const isPve = useGameStore.getState().gameMode === 'PVE';
                    const p1Auto = useGameStore.getState().p1AutoCapture;
                    const p2Auto = useGameStore.getState().p2AutoCapture;

                    if (!isPve && ((turn === 'P1' && p1Auto) || (turn === 'P2' && p2Auto))) {
                        await captureYes(true);
                        return;
                    }

                    useGameStore.getState().setGameState('CAPTURE_PROMPT');
                    return;
                }
            }

            break;
        }

        break;
    }

    apply();
    switchWithEmptyCheck(board, turn);
}


export async function captureYes(isAuto = false) {
    const s = useGameStore.getState();
    s.pushUndo();
    const cup = s.pendingCapture;
    const mirror = 15 - cup;
    const store = s.turn === 'P1' ? 15 : 16;

    const board = [...s.board];
    const seeds = s.seeds.map(x => ({ ...x }));

    board[store] += board[cup] + board[mirror];
    board[cup] = 0;
    board[mirror] = 0;
    seeds.forEach(x => {

        if (x.cup === cup || x.cup === mirror) x.cup = store;
    });

    s.applyState(board, seeds);
    s.setPending(null);

    if (isAuto === true && s.speed > 0) {
        await wait(s.speed);

        if (checkAbort()) return;
    }

    const sAfter = useGameStore.getState();
    sAfter.appendTurnNotation('x');

    switchWithEmptyCheck(board, sAfter.turn);
}


export function captureNo() {
    const s = useGameStore.getState();
    s.setPending(null);
    switchWithEmptyCheck([...s.board], s.turn);
}