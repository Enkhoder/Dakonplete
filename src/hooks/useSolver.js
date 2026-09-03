//////// IMPORTS ////////

import { playTurn, captureYes, captureNo } from './useDakonEngine';
import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';


//////// CONSTANTS ////////

const SOLVE_OPTIONS = { timeMs: 4000, maxDepth: 4 };

const BOT_DELAY_MS = 350;



//////// MAIN CONTROL FLOW ////////

export function useSolver() {
    const workerRef = useRef(null);
    const requestRef = useRef(0);
    const captureChoiceRef = useRef(true);

    const board = useGameStore(s => s.board);
    const turn = useGameStore(s => s.turn);
    const gameState = useGameStore(s => s.gameState);
    const gameMode = useGameStore(s => s.gameMode);
    const humanSide = useGameStore(s => s.humanSide);
    const autoHint = useGameStore(s => s.autoHint);
    const previewIndex = useGameStore(s => s.previewIndex);
    const isImportReview = useGameStore(s => s.isImportReview);
    const solverStatus = useGameStore(s => s.solverStatus);
    const solverResult = useGameStore(s => s.solverResult);

    useEffect(() => {
        const worker = new Worker(new URL('../solver/solverWorker.js', import.meta.url), { type: 'module' });

        worker.onmessage = (event) => {
            const { type, requestId, result, message } = event.data;

            if (requestId !== requestRef.current) return;

            if (type === 'RESULT') useGameStore.getState().setSolverResult(result);

            else if (type === 'ERROR') useGameStore.getState().setSolverError(message);
        };

        workerRef.current = worker;

        return () => {
            worker.terminate();
            workerRef.current = null;
        };
    }, []);

    const solvable = (gameState === 'IDLE' || gameState === 'FREE_PICK')
        && previewIndex === null
        && !isImportReview;

    const solve = useCallback(() => {

        if (!solvable || workerRef.current === null) return;

        requestRef.current++;
        useGameStore.getState().setSolverStatus('THINKING');
        workerRef.current.postMessage({
            type: 'SOLVE',
            requestId: requestRef.current,
            board: Array.from(useGameStore.getState().board),
            turn: useGameStore.getState().turn,
            options: SOLVE_OPTIONS,
        });
    }, [solvable]);

    useEffect(() => {

        if (useGameStore.getState().solverStatus !== 'IDLE') useGameStore.getState().clearSolver();
    }, [board, turn, gameState]);

    useEffect(() => {

        if (!autoHint || !solvable) return;

        const timer = setTimeout(solve, 60);
        return () => clearTimeout(timer);
    }, [autoHint, solvable, solve, board, turn]);

    useEffect(() => {
        const handleKeyDown = (event) => {

            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

            if (event.code !== 'Space' && event.key !== ' ') return;

            event.preventDefault();
            solve();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [solve]);

    const botTurn = gameMode === 'PVE' && turn !== humanSide;

    useEffect(() => {

        if (!botTurn || isImportReview || previewIndex !== null) return;

        if (gameState === 'CAPTURE_PROMPT') {
            const takeCapture = captureChoiceRef.current;
            const timer = setTimeout(() => (takeCapture ? captureYes(true) : captureNo()), BOT_DELAY_MS);
            return () => clearTimeout(timer);
        }

        if (gameState !== 'IDLE' && gameState !== 'FREE_PICK') return;

        if (solverStatus === 'IDLE') {
            solve();
            return;
        }

        if (solverStatus !== 'READY' || solverResult === null) return;

        const timer = setTimeout(() => {
            const state = useGameStore.getState();

            if (state.turn !== turn || state.gameState !== gameState) return;

            captureChoiceRef.current = solverResult.capture !== false;
            playTurn(solverResult.cup);
        }, BOT_DELAY_MS);

        return () => clearTimeout(timer);
    }, [botTurn, gameState, solverStatus, solverResult, turn, solve, isImportReview, previewIndex]);

    return { solve, solvable, captureYes, captureNo };
}