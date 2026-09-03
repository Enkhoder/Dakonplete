//////// IMPORTS ////////

import { SEED_COLORS } from './seedTheme';


//////// CONSTANTS ////////

const TRAVERSAL = [1, 2, 3, 4, 5, 6, 7, 15, 8, 9, 10, 11, 12, 13, 14, 16];



//////// UTILITIES ////////

const getNext = (cur, turn) => {
    const idx = TRAVERSAL.indexOf(cur);
    let ni = (idx + 1) % 16;
    let next = TRAVERSAL[ni];

    if (turn === 'P1' && next === 16) next = TRAVERSAL[(ni + 1) % 16];

    if (turn === 'P2' && next === 15) next = TRAVERSAL[(ni + 1) % 16];

    return next;
};


function initBoard() {
    const b = Array(17).fill(0);

    for (let i = 1; i <= 14; i++) b[i] = 7;

    return b;
}


function initSeeds() {
    const seeds = [];
    let id = 0;

    for (let cup = 1; cup <= 14; cup++) {

        for (let j = 0; j < 7; j++) {
            seeds.push({ id: id++, color: SEED_COLORS[id % SEED_COLORS.length], cup });
        }
    }

    return seeds;
}



//////// MAIN CONTROL FLOW ////////

export function exportNotation(notations, p1Score = null, p2Score = null) {
    let res = [];
    let maxP1Len = 0;

    for (let i = 0; i < notations.length; i += 2) {

        if (notations[i].length > maxP1Len) maxP1Len = notations[i].length;
    }

    let alignPoint = maxP1Len;

    if (p1Score !== null && p2Score !== null) {
        const leftPartLen = `[ P1 | ${p1Score}`.length;
        alignPoint = Math.max(maxP1Len, leftPartLen);
    }

    for (let i = 0; i < notations.length; i += 2) {
        const p1 = notations[i].padStart(alignPoint, ' ');
        const p2 = notations[i + 1] ? notations[i + 1] : '';
        res.push(`${p1} ${p2}`.trimEnd());
    }

    let out = res.join('\n');

    if (p1Score !== null && p2Score !== null) {
        const leftPart = `[ P1 | ${p1Score}`;
        const rightPart = `${p2Score} | P2 ]`;
        const padCount = Math.max(0, alignPoint - leftPart.length);
        const padding = ' '.repeat(padCount);
        out += `\n\n${padding}${leftPart}-${rightPart}`;
    }

    return out;
}


export function simulateGame(text) {
    let inComment = false;
    let currentChunk = "";
    let chunks = [];

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === '[') {

            if (inComment) return { error: "Nested brackets or unclosed comment before '['" };

            if (currentChunk) chunks.push(currentChunk);

            currentChunk = "";
            inComment = true;
        }

        else if (char === ']') {

            if (!inComment) return { error: "Unexpected ']'" };

            inComment = false;
        }

        else {

            if (!inComment) {
                currentChunk += char;
            }
        }
    }

    if (inComment) return { error: "Unclosed '['" };

    if (currentChunk) chunks.push(currentChunk);

    const validChunks = chunks.filter(c => c.trim().length > 0);

    if (validChunks.length === 0) return { error: "Nothing to import" };

    const tokens = validChunks[0].trim().split(/\s+/).filter(Boolean);
    let invalidSyntaxAfter = null;

    if (validChunks.length > 1) {
        invalidSyntaxAfter = validChunks[1].trim().split(/\s+/)[0];
    }

    let board = initBoard();
    let seeds = initSeeds();
    let turn = 'P1';
    let moveCount = 0;

    const historyStr = [];
    const undoStack = [];

    const rollbackTo = (snapshot) => {
        board = [...snapshot.board];
        seeds = snapshot.seeds.map(x => ({ ...x }));
        turn = snapshot.turn;
        moveCount = snapshot.moveCount;
        undoStack.length = snapshot.undoStackLength;
    };

    const haltWith = (msg, picks, snapshot) => {

        if (snapshot) rollbackTo(snapshot);

        if (picks && picks.length > 0) historyStr.push(picks.join(''));

        return {
            error: msg,
            validTo: historyStr,
            undoStack,
            board,
            seeds,
            turn,
            moveCount,
            gameState: 'IDLE',
            currentTurnNotation: ''
        };
    };

    for (let t = 0; t < tokens.length; t++) {
        const originalToken = tokens[t];
        let token = originalToken;
        const isGameOverToken = token.endsWith('#');

        if (isGameOverToken) token = token.slice(0, -1);

        const tokenSnapshot = {
            board: [...board],
            seeds: seeds.map(x => ({ ...x })),
            turn,
            moveCount,
            undoStackLength: undoStack.length
        };

        let currentTurnNotation = '';
        const subPicks = token.split('p');
        let validPicks = [];
        let stateBeforeSegmentStart = tokenSnapshot;

        for (let i = 0; i < subPicks.length; i++) {
            let pickStr = subPicks[i];

            if (pickStr === '' && i === subPicks.length - 1) {
                const p1Sum = board.slice(1, 8).reduce((a, b) => a + b, 0);
                const p2Sum = board.slice(8, 15).reduce((a, b) => a + b, 0);
                const isCurrentGameOver = (board[15] + board[16] === 98
                    || p1Sum === 0 || p2Sum === 0);

                if (isCurrentGameOver) {

                    if (isGameOverToken) {
                        break;
                    }

                    else {
                        return haltWith(
                            "Missing finisher (#) on a completed game at token '"
                            + originalToken + "'",
                            [],
                            tokenSnapshot
                        );
                    }
                }

                else {

                    if (isGameOverToken) {
                        return haltWith(
                            "Premature finisher (#) at token '" + originalToken + "'",
                            [],
                            tokenSnapshot
                        );
                    }

                    if (t === tokens.length - 1) {
                        return {
                            success: true,
                            historyStr,
                            currentTurnNotation,
                            undoStack, board, seeds, turn, moveCount,
                            gameState: 'FREE_PICK'
                        };
                    }

                    else {
                        return haltWith(
                            "Free pick (p) cannot terminate a turn at token '"
                            + originalToken + "'",
                            [],
                            tokenSnapshot
                        );
                    }
                }
            }

            const stateBeforeThisPick = {
                board: [...board],
                seeds: seeds.map(x => ({ ...x })),
                turn,
                moveCount,
                undoStackLength: undoStack.length
            };

            const handleFailure = (msg) => {

                if (i > 0) {
                    rollbackTo(stateBeforeSegmentStart);
                    validPicks.pop();
                }

                else {
                    rollbackTo(tokenSnapshot);
                }

                return haltWith(msg, validPicks);
            };

            const match = pickStr.match(/^(\d+)(x?)(.*)$/);

            if (!match) {
                return handleFailure(
                    "Invalid sequence at token '" + originalToken + "'"
                );
            }

            const cupStr = match[1];
            let hasX = match[2] === 'x';
            const garbage = match[3];

            if (garbage) {
                hasX = false;
            }

            const cupIndex = parseInt(cupStr, 10);

            if (cupIndex < 1 || cupIndex > 14) {
                return handleFailure(
                    "Invalid cup index '" + cupIndex + "' on token '"
                    + originalToken + "'"
                );
            }

            const ownCup = (turn === 'P1' && cupIndex >= 1 && cupIndex <= 7)
                || (turn === 'P2' && cupIndex >= 8 && cupIndex <= 14);

            if (!ownCup) {
                return handleFailure(
                    "Player picked opponent cup at token '" + originalToken + "'"
                );
            }

            let count = board[cupIndex];

            if (count === 0) {
                return handleFailure(
                    "Picked own empty cup at token '" + originalToken + "'"
                );
            }

            let tempBoard = [...board];
            let tempCup = cupIndex;
            let tempCount = tempBoard[tempCup];
            let isFreePick = false;

            while (tempCount > 0) {
                tempBoard[tempCup] = 0;
                let cur = tempCup;

                for (let k = 0; k < tempCount; k++) {
                    cur = getNext(cur, turn);
                    tempBoard[cur]++;
                }

                const landsInStore = (turn === 'P1' && cur === 15)
                    || (turn === 'P2' && cur === 16);

                if (landsInStore) {
                    isFreePick = true;
                    break;
                }

                if (cur >= 1 && cur <= 14 && tempBoard[cur] > 1) {
                    tempCup = cur;
                    tempCount = tempBoard[tempCup];
                    continue;
                }

                break;
            }

            if (isFreePick && (garbage || i === subPicks.length - 1)) {
                return handleFailure(
                    "Expected free pick (p) at token '" + originalToken + "'"
                );
            }

            undoStack.push({
                board: [...board],
                seeds: seeds.map(x => ({ ...x })),
                turn,
                moveCount,
                notations: [...historyStr],
                currentTurnNotation,
            });

            let rebuiltSegment = (cupIndex).toString();
            currentTurnNotation += rebuiltSegment;
            moveCount++;

            let cup = cupIndex;

            while (true) {
                count = board[cup];

                if (count === 0) break;

                board[cup] = 0;
                const hand = seeds.filter(x => x.cup === cup);
                hand.forEach(x => { x.cup = -1; });

                let cur = cup;
                let lastWasEmpty = false;

                for (let k = 0; k < count; k++) {
                    cur = getNext(cur, turn);

                    if (k === count - 1) lastWasEmpty = (board[cur] === 0);

                    board[cur]++;
                    hand[k].cup = cur;
                }

                const ownStore = (turn === 'P1' && cur === 15)
                    || (turn === 'P2' && cur === 16);

                if (ownStore) {

                    if (i < subPicks.length - 1) {
                        rebuiltSegment += 'p';
                        currentTurnNotation += 'p';
                    }

                    break;
                }

                if (cur >= 1 && cur <= 14) {

                    if (!lastWasEmpty) {
                        cup = cur;
                        continue;
                    }

                    const ownSide = (turn === 'P1' && cur <= 7)
                        || (turn === 'P2' && cur >= 8);

                    if (ownSide) {
                        const mirror = 15 - cur;

                        if (board[mirror] > 0) {

                            if (hasX) {
                                undoStack.push({
                                    board: [...board],
                                    seeds: seeds.map(x => ({ ...x })),
                                    turn,
                                    moveCount,
                                    notations: [...historyStr],
                                    currentTurnNotation,
                                });

                                const store = turn === 'P1' ? 15 : 16;
                                board[store] += board[cur] + board[mirror];
                                board[cur] = 0;
                                board[mirror] = 0;
                                seeds.forEach(x => {

                                    if (x.cup === cur || x.cup === mirror) x.cup = store;
                                });
                                rebuiltSegment += 'x';
                                currentTurnNotation += 'x';
                            }
                        }
                    }

                    break;
                }

                break;
            }

            {
                const postP1Sum = board.slice(1, 8).reduce((a, b) => a + b, 0);
                const postP2Sum = board.slice(8, 15).reduce((a, b) => a + b, 0);
                const postPickGameOver = (board[15] + board[16] === 98
                    || postP1Sum === 0 || postP2Sum === 0);

                if (postPickGameOver) {
                    const isAtEnd = (i === subPicks.length - 1);
                    const nextIsTerminator = (i + 1 === subPicks.length - 1)
                        && (subPicks[i + 1] === '');

                    if (!((isAtEnd || nextIsTerminator) && isGameOverToken)) {
                        return handleFailure(
                            "Missing finisher (#) on a completed game at token '"
                            + originalToken + "'"
                        );
                    }
                }
            }

            if (garbage) {
                return handleFailure(
                    "Invalid sequence at token '" + originalToken + "'"
                );
            }

            stateBeforeSegmentStart = stateBeforeThisPick;
            validPicks.push(rebuiltSegment);
        }

        let builtToken = validPicks.join('');
        let isCurrentGameOver = false;
        const p1Sum = board.slice(1, 8).reduce((a, b) => a + b, 0);
        const p2Sum = board.slice(8, 15).reduce((a, b) => a + b, 0);

        if (board[15] + board[16] === 98 || p1Sum === 0 || p2Sum === 0) {

            if (!isGameOverToken) {
                return haltWith(
                    "Missing finisher (#) on a completed game at token '"
                    + originalToken + "'",
                    [],
                    tokenSnapshot
                );
            }

            isCurrentGameOver = true;
            builtToken += '#';
        }

        else if (isGameOverToken) {
            return haltWith(
                "Premature finisher (#) at token '" + originalToken + "'",
                [],
                tokenSnapshot
            );
        }

        historyStr.push(builtToken);

        if (isCurrentGameOver) {
            turn = 'P1';

            if (invalidSyntaxAfter) {
                return {
                    error: "Invalid syntax outside brackets '" + invalidSyntaxAfter + "'",
                    validTo: historyStr, undoStack, board, seeds, turn, moveCount
                };
            }

            return {
                success: true, historyStr, undoStack, board, seeds, turn, moveCount,
                gameState: 'GAME_OVER'
            };
        }

        turn = turn === 'P1' ? 'P2' : 'P1';
    }

    if (invalidSyntaxAfter) {
        return {
            error: "Invalid syntax outside brackets '" + invalidSyntaxAfter + "'",
            validTo: historyStr, undoStack, board, seeds, turn, moveCount
        };
    }

    return {
        success: true, historyStr, undoStack, board, seeds, turn, moveCount,
        gameState: 'IDLE'
    };
}
