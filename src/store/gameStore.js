//////// IMPORTS ////////

import { SEED_COLORS } from '../utils/seedTheme';
import { create } from 'zustand';



//////// UTILITIES ////////

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



//////// STATE ////////

export const useGameStore = create((set, get) => ({
    board: initBoard(),
    seeds: initSeeds(),
    turn: 'P1',
    gameState: 'IDLE',
    gameMode: 'PVP',
    humanSide: 'P1',
    speed: 200,
    autoHint: false,
    solverTarget: 'current',
    p1AutoCapture: false,
    p2AutoCapture: false,
    moveCount: 0,
    pendingCapture: null,
    undoStack: [],
    redoStack: [],
    resetRequested: false,
    notations: [],
    currentTurnNotation: '',
    isImportReview: false,
    wrongClickId: 0,
    lastWrongClickMs: 0,
    divergedNotations: null,
    divergedCurrentTurnNotation: null,
    suppressGameOverAnnouncer: false,
    toastRequest: null,
    backLiveShakeId: 0,
    lastBackLiveShakeMs: 0,
    previewIndex: null,
    solverStatus: 'IDLE',
    solverResult: null,
    solverError: null,

    setSolverStatus: (s) => set({ solverStatus: s }),
    setSolverResult: (r) => set({ solverResult: r, solverStatus: 'READY', solverError: null }),
    setSolverError: (e) => set({ solverError: e, solverStatus: 'IDLE', solverResult: null }),
    clearSolver: () => set({ solverStatus: 'IDLE', solverResult: null, solverError: null }),

    resetGame: () => {
        const s = get();
        const restoredSeeds = s.seeds.map(seed => {
            return { ...seed, cup: Math.floor(seed.id / 7) + 1 };
        });

        set({
            board: initBoard(), seeds: restoredSeeds, turn: 'P1',
            gameState: 'IDLE', moveCount: 0, pendingCapture: null,
            undoStack: [], redoStack: [], resetRequested: false,
            notations: [], currentTurnNotation: '', isImportReview: false,
            previewIndex: null, divergedNotations: null, divergedCurrentTurnNotation: null,
            suppressGameOverAnnouncer: false, toastRequest: null,
            solverStatus: 'IDLE', solverResult: null, solverError: null,
        });
    },

    setMode: (m) => { set({ gameMode: m }); get().resetGame(); },
    setSide: (s) => { set({ humanSide: s }); get().resetGame(); },
    setSpeed: (v) => set({ speed: v }),
    setAutoHint: (v) => set({ autoHint: v }),
    setP1AutoCapture: (v) => set({ p1AutoCapture: v }),
    setP2AutoCapture: (v) => set({ p2AutoCapture: v }),
    setSolverTarget: (t) => set({ solverTarget: t }),
    setGameState: (g) => set({ gameState: g }),
    setTurn: (t) => set({ turn: t }),
    setPending: (c) => set({ pendingCapture: c }),
    incMoves: () => set(s => ({ moveCount: s.moveCount + 1 })),

    triggerWrongClick: () => {
        const now = Date.now();
        const s = get();

        if (now - s.lastWrongClickMs < 600) return;

        set({ wrongClickId: s.wrongClickId + 1, lastWrongClickMs: now });
    },

    appendTurnNotation: (suffix) => set(s => ({
        currentTurnNotation: s.currentTurnNotation + suffix
    })),

    commitTurnNotation: () => set(s => ({
        notations: [...s.notations, s.currentTurnNotation], currentTurnNotation: ''
    })),

    setPreviewIndex: (idx) => set({ previewIndex: idx }),
    clearPreview: () => set({ previewIndex: null }),

    loadImportedGame: (
        historyStr, uStack, snapBoard, snapSeeds,
        finalTurn, moveCount, finalGameState, currentTurnNot = ''
    ) => set((s) => {
        const isSameImport = s.isImportReview
            && historyStr.length === s.notations.length
            && historyStr.every((t, i) => t === s.notations[i]);

        return {
            notations: historyStr,
            undoStack: uStack,
            redoStack: [],
            board: snapBoard,
            seeds: snapSeeds,
            turn: finalTurn,
            moveCount: moveCount,
            gameState: finalGameState,
            currentTurnNotation: currentTurnNot,
            isImportReview: true,
            previewIndex: uStack.length > 0 ? uStack.length - 1 : null,
            suppressGameOverAnnouncer: isSameImport,
        };
    }),

    pushUndo: () => {
        const s = get();
        let currentNots = s.notations;
        let currentTurnNot = s.currentTurnNotation;

        if (s.divergedNotations !== null) {
            currentNots = [...s.divergedNotations];
            currentTurnNot = s.divergedCurrentTurnNotation || '';
        }

        const snap = {
            board: [...s.board],
            seeds: s.seeds.map(x => ({ ...x })),
            turn: s.turn,
            moveCount: s.moveCount,
            notations: [...currentNots],
            currentTurnNotation: currentTurnNot,
        };

        set({
            undoStack: [...s.undoStack, snap],
            redoStack: [],
            notations: [...currentNots],
            currentTurnNotation: currentTurnNot,
            divergedNotations: null,
            divergedCurrentTurnNotation: null,
        });
    },

    undo: () => {
        const s = get();

        if (s.undoStack.length === 0 || s.gameState === 'ANIMATING') return;

        const newUndo = [...s.undoStack];
        const target = newUndo.pop();
        const actualNots = s.divergedNotations !== null ? s.divergedNotations : s.notations;
        const actualTurnNot = s.divergedNotations !== null
            ? s.divergedCurrentTurnNotation
            : s.currentTurnNotation;

        const current = {
            board: [...s.board], seeds: s.seeds.map(x => ({ ...x })),
            turn: s.turn, moveCount: s.moveCount,
            notations: [...actualNots], currentTurnNotation: actualTurnNot || '',
        };

        const restoredGameState = target.currentTurnNotation.endsWith('p')
            ? 'FREE_PICK'
            : 'IDLE';

        set({
            board: target.board, seeds: target.seeds,
            turn: target.turn, moveCount: target.moveCount,
            gameState: restoredGameState, pendingCapture: null,
            undoStack: newUndo,
            redoStack: [...s.redoStack, current],
            divergedNotations: target.notations,
            divergedCurrentTurnNotation: target.currentTurnNotation,
        });
    },

    redo: () => {
        const s = get();

        if (s.redoStack.length === 0 || s.gameState === 'ANIMATING') return;

        const newRedo = [...s.redoStack];
        const entry = newRedo.pop();
        const actualNots = s.divergedNotations !== null ? s.divergedNotations : s.notations;
        const actualTurnNot = s.divergedNotations !== null
            ? s.divergedCurrentTurnNotation
            : s.currentTurnNotation;

        const current = {
            board: [...s.board], seeds: s.seeds.map(x => ({ ...x })),
            turn: s.turn, moveCount: s.moveCount,
            notations: [...actualNots], currentTurnNotation: actualTurnNot || '',
        };

        const isPresent = newRedo.length === 0;
        const restoredGameState = entry.currentTurnNotation.endsWith('p')
            ? 'FREE_PICK'
            : 'IDLE';

        set({
            board: entry.board, seeds: entry.seeds,
            turn: entry.turn, moveCount: entry.moveCount,
            gameState: restoredGameState, pendingCapture: null,
            undoStack: [...s.undoStack, current],
            redoStack: newRedo,
            divergedNotations: isPresent ? null : entry.notations,
            divergedCurrentTurnNotation: isPresent ? null : entry.currentTurnNotation,
        });
    },

    triggerToast: (text, type) => set({ toastRequest: { text, type, id: Date.now() } }),

    triggerBackLiveShake: () => {
        const now = Date.now();
        const s = get();

        if (now - s.lastBackLiveShakeMs < 600) return;

        set({ backLiveShakeId: s.backLiveShakeId + 1, lastBackLiveShakeMs: now });
    },

    requestUndo: () => {
        const s = get();
        const disabled = s.gameState === 'ANIMATING' || !s.undoStack.length
            || s.isImportReview || s.previewIndex !== null;

        if (disabled) {

            if (s.previewIndex !== null) {
                s.triggerToast("Return to live position to undo.", "error");
                s.triggerBackLiveShake();
            }

            else if (s.isImportReview) {
                s.triggerToast("This game is read-only.", "error");
            }

            else if (!s.undoStack.length) {
                s.triggerToast("You've reached the top!", "error");
            }
        }

        else {
            s.undo();
        }
    },

    requestRedo: () => {
        const s = get();
        const disabled = s.gameState === 'ANIMATING' || !s.redoStack.length
            || s.isImportReview || s.previewIndex !== null;

        if (disabled) {

            if (s.previewIndex !== null) {
                s.triggerToast("Nothing to redo.", "error");
                s.triggerBackLiveShake();
            }

            else if (s.isImportReview) {
                s.triggerToast("This game is read-only.", "error");
            }

            else if (!s.redoStack.length) {
                s.triggerToast("This is where we are now!", "error");
            }
        }

        else {
            s.redo();
        }
    },

    applyState: (board, seeds) => set({ board, seeds }),
}));