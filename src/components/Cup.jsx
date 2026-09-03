//////// IMPORTS ////////

import { getSeedOffsetsForCup } from '../utils/seedPhysics';
import useHarmonicGlow from '../hooks/useHarmonicGlow';
import { PLAYER_COLORS } from '../utils/playerColors';
import { useState, useEffect, useRef } from 'react';
import { playTurn } from '../hooks/useDakonEngine';
import { useGameStore } from '../store/gameStore';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import Seed from './Seed';



//////// CONSTANTS ////////

const SCALE = 1.1;

const BASE_BORDER = 2.5;

const HOVER_BORDER = +(BASE_BORDER / SCALE).toFixed(2);



//////// COMPONENTS ////////

export default function Cup({ index, isStore = false }) {
    const liveBoard = useGameStore(s => s.board);
    const liveSeeds = useGameStore(s => s.seeds);
    const liveTurn = useGameStore(s => s.turn);
    const liveGameState = useGameStore(s => s.gameState);

    const previewIndex = useGameStore(s => s.previewIndex);
    const undoStack = useGameStore(s => s.undoStack);
    const snap = previewIndex !== null && undoStack[previewIndex + 1]
        ? undoStack[previewIndex + 1]
        : null;

    const board = snap ? snap.board : liveBoard;
    const seeds = snap ? snap.seeds : liveSeeds;
    const turn = snap ? snap.turn : liveTurn;
    const gameState = snap ? 'PREVIEW' : liveGameState;

    const gameMode = useGameStore(s => s.gameMode);
    const humanSide = useGameStore(s => s.humanSide);
    const pendingCapture = useGameStore(s => s.pendingCapture);
    const wrongClickId = useGameStore(s => s.wrongClickId);
    const triggerWrongClick = useGameStore(s => s.triggerWrongClick);
    const isImportReview = useGameStore(s => s.isImportReview);

    const cupRef = useRef(null);

    const [isShaking, setIsShaking] = useState(false);

    useEffect(() => {

        if (wrongClickId === 0) return;

        if (!clickable) return;

        const t1 = setTimeout(() => setIsShaking(true), 0);
        const t2 = setTimeout(() => setIsShaking(false), 400);
        return () => { clearTimeout(t1); clearTimeout(t2); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wrongClickId]);

    const count = board[index];
    const cupSeeds = seeds.filter(s => s.cup === index);
    const cupR = isStore ? 40 : 25;

    const redoStack = useGameStore(s => s.redoStack);
    const divergedNotations = useGameStore(s => s.divergedNotations);

    let clickable = false;
    let validRelativeIndex = 0;

    let isPreCapture = false;

    if (divergedNotations !== null && redoStack.length > 0) {
        const nextState = redoStack[redoStack.length - 1];
        let nextPart = '';

        if (nextState.notations.length > divergedNotations.length) {
            nextPart = nextState.notations[nextState.notations.length - 1];
        }

        else {
            nextPart = nextState.currentTurnNotation || '';
        }

        isPreCapture = nextPart.endsWith('x');
    }

    if (
        !isImportReview && !isPreCapture
        && (gameState === 'IDLE' || gameState === 'FREE_PICK')
        && count > 0 && !isStore
    ) {

        if (gameMode === 'PVP') {
            clickable = (turn === 'P1' && index <= 7)
                || (turn === 'P2' && index >= 8 && index <= 14);
        }

        else {
            const isHuman = turn === humanSide;

            if (isHuman) {
                clickable =
                    (humanSide === 'P1' && index <= 7)
                    || (humanSide === 'P2' && index >= 8 && index <= 14);
            }
        }

        if (clickable) {
            const rowStart = index <= 7 ? 1 : 8;

            for (let i = rowStart; i < index; i++) {

                if (board[i] > 0) validRelativeIndex++;
            }
        }
    }

    useHarmonicGlow(cupRef, clickable, validRelativeIndex);

    const offsets = getSeedOffsetsForCup(cupSeeds.map(s => s.id), index, cupR);

    const isPlayerCup = gameState === 'CAPTURE_PROMPT' && index === pendingCapture;
    const isOpponentCup = gameState === 'CAPTURE_PROMPT'
        && pendingCapture != null && index === 15 - pendingCapture;

    const solverResult = useGameStore(s => s.solverResult);
    const solverStatus = useGameStore(s => s.solverStatus);
    const isRecommended = solverStatus === 'READY' && solverResult !== null
        && !isStore && solverResult.cup === index && gameState !== 'CAPTURE_PROMPT';

    const isP1Store = isStore && index === 15;
    const isP2Store = isStore && index === 16;
    const cupBgColor = isP1Store ? '#24486E' : isP2Store ? '#6E2424' : '#7A4C1C';

    return (
        <div
            className={isShaking ? 'wrong-click-shake' : ''}
            style={{
                width: isStore ? 100 : 70,
                height: isStore ? 100 : 70,
                flexShrink: 0,
            }}
        >
            <motion.div
                ref={cupRef}
                className={`group relative flex items-center justify-center rounded-full w-full h-full
                    ${clickable ? 'cursor-pointer' : ''}
                    ${isPlayerCup ? 'flicker-glow-green z-40' : ''}
                    ${isOpponentCup ? 'flicker-glow-red z-40' : ''}
                    ${isRecommended ? 'solver-recommended z-30' : ''}
                `}
                style={{
                    backgroundColor: cupBgColor,
                    borderStyle: 'solid',
                    borderColor: '#000',
                    borderWidth: isStore ? BASE_BORDER : undefined,
                }}
                variants={{
                    rest: { scale: 1, borderWidth: BASE_BORDER, zIndex: 1 },
                    hover: { scale: SCALE, borderWidth: HOVER_BORDER, zIndex: 40 },
                }}
                initial="rest"
                whileHover="hover"
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                onClick={() => {

                    if (isImportReview) return;

                    if (clickable) {
                        playTurn(index);
                    }

                    else if (
                        !isPreCapture
                        && (gameState === 'IDLE' || gameState === 'FREE_PICK')
                    ) {
                        triggerWrongClick();
                    }
                }}
            >
                <div
                    className="absolute -top-7 left-1/2 -translate-x-1/2 text-[11px] font-bold
                        px-2 py-0.5 bg-black text-white opacity-0 group-hover:opacity-100
                        transition-opacity pointer-events-none whitespace-nowrap z-50"
                >
                    {isStore ? (
                        <>
                            <span
                                style={{
                                    color: index === 15
                                        ? PLAYER_COLORS.p1[300]
                                        : PLAYER_COLORS.p2[300]
                                }}
                            >
                                {index === 15 ? 'P1' : 'P2'}
                            </span>
                            <span
                                style={{
                                    color: index === 15
                                        ? PLAYER_COLORS.p1[200]
                                        : PLAYER_COLORS.p2[200]
                                }}
                            >
                                {' | '}
                            </span>
                            {count}
                        </>
                    ) : (
                        count
                    )}
                </div>

                {cupSeeds.map((seed, i) => (
                    <Seed
                        key={seed.id}
                        seed={seed}
                        offset={offsets[i]}
                    />
                ))}
            </motion.div>
        </div>
    );
}
