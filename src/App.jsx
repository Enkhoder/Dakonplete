//////// IMPORTS ////////

import { captureYes, captureNo } from './hooks/useDakonEngine';
import { PLAYER_COLORS } from './utils/playerColors';
import { useSolver } from './hooks/useSolver';
import { HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import AnimatedHeader from './components/AnimatedHeader';
import NotationTracker from './components/NotationTracker';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from './store/gameStore';
import HelpModal from './components/HelpModal';
import Controls from './components/Controls';
import GameBoard from './components/GameBoard';
import { useEffect, useState } from 'react';


//////// COMPONENTS ////////

const KeyBox = ({ children, className = "" }) => (
    <span
        className={
            "inline-flex items-center justify-center h-[14px] px-1 border"
            + " border-black rounded-[2px] text-[8px] bg-emerald-100"
            + ` text-emerald-900 font-bold leading-none ${className}`
        }
    >
        {children}
    </span>
);


const PeekIcon = () => {
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => setTick(t => (t + 1) % 4), 1250);
        return () => clearInterval(timer);
    }, []);

    return (tick % 2 === 0)
        ? <ChevronLeft size={13} className="text-emerald-600" />
        : <ChevronRight size={13} className="text-emerald-600" />;
};


const InstructionCycle = () => {
    const [index, setIndex] = useState(0);
    const [direction, setDirection] = useState(1);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => {
                const next = (prev + 1) % 3;
                setDirection(next === 0 ? -1 : 1);
                return next;
            });
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const variants = {
        enter: (d) => ({ x: d === 1 ? -20 : 20, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (d) => ({ x: d === 1 ? 20 : -20, opacity: 0 }),
    };

    return (
        <motion.div
            layout
            transition={{ layout: { duration: 0.3, ease: "easeInOut" } }}
            className={
                "flex items-center bg-white h-8 text-[11px] text-gray-600"
                + " border-2 border-black font-medium overflow-hidden relative"
            }
        >
            <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                <motion.div
                    key={index}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className={
                        "flex items-center justify-center gap-1.5"
                        + " px-3 h-full whitespace-nowrap"
                    }
                >
                    {index === 0 && (
                        <div className="flex items-center gap-1">
                            <KeyBox>CTRL</KeyBox>
                            <span>+</span>
                            <KeyBox>Z</KeyBox>
                            <span>/</span>
                            <KeyBox>Y</KeyBox>
                            <span className="ml-1">to undo/redo moves</span>
                        </div>
                    )}
                    {index === 1 && (
                        <>
                            <PeekIcon />
                            <span>Press Left/Right Arrows to peek</span>
                        </>
                    )}
                    {index === 2 && (
                        <>
                            <KeyBox className="pt-[3px]">
                                &nbsp;&nbsp;&nbsp;‾‾‾&nbsp;&nbsp;&nbsp;
                            </KeyBox>
                            <span>Press Space for best move</span>
                        </>
                    )}
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
};


const SolverReadout = ({ result, status }) => {

    if (status !== 'READY' || result === null) return null;

    const label = result.kind === 'book'
        ? `Book · cup ${result.cup} · ${result.remaining} picks left in the line`
        : `Cup ${result.picks[0]} · score ${result.score > 0 ? '+' : ''}${Math.round(result.score)}`
            + ` · depth ${result.depth} · ${result.nodes.toLocaleString()} nodes`;

    return (
        <div
            className={
                "w-full max-w-lg px-3 py-2 border-2 border-black bg-amber-50"
                + " text-[11px] font-bold text-gray-700 flex items-center gap-2"
            }
        >
            <span className="w-2 h-2 rounded-full bg-amber-500 border border-black" />
            {label}
            {result.picks.length > 1 && (
                <span className="ml-auto font-mono text-gray-500">{result.notation}</span>
            )}
        </div>
    );
};


const HeaderActions = ({ onHelpClick }) => (
    <div className="flex gap-3">
        <InstructionCycle />
        <button
            onClick={onHelpClick}
            className={
                "aspect-square h-8 flex items-center justify-center border-2"
                + " border-black bg-white text-gray-500 hover:bg-emerald-100"
                + " transition-colors"
            }
        >
            <HelpCircle size={14} />
        </button>
        <div
            className={
                "flex items-center gap-1.5 bg-white px-3 h-8 text-[11px]"
                + " text-gray-600 border-2 border-black font-medium min-w-[170px]"
            }
        >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-[flicker_1s_ease-in-out_infinite]" />
            Click on a cup to sow seeds
        </div>
    </div>
);



//////// MAIN CONTROL FLOW ////////

export default function App() {
    const liveTurn = useGameStore(s => s.turn);
    const liveGameState = useGameStore(s => s.gameState);
    const liveBoard = useGameStore(s => s.board);
    const liveMoveCount = useGameStore(s => s.moveCount);

    const autoHint = useGameStore(s => s.autoHint);
    const solverTarget = useGameStore(s => s.solverTarget);
    const resetGame = useGameStore(s => s.resetGame);
    const setAutoHint = useGameStore(s => s.setAutoHint);
    const undoStack = useGameStore(s => s.undoStack);
    const wrongClickId = useGameStore(s => s.wrongClickId);
    const suppressGameOverAnnouncer = useGameStore(s => s.suppressGameOverAnnouncer);
    const notations = useGameStore(s => s.notations);

    const solverStatus = useGameStore(s => s.solverStatus);
    const solverResult = useGameStore(s => s.solverResult);
    const { solve, solvable } = useSolver();
    const solverBusy = !solvable || solverStatus === 'THINKING';

    const [isBadgeShaking, setIsBadgeShaking] = useState(false);

    useEffect(() => {

        if (wrongClickId === 0) return;

        const t1 = setTimeout(() => setIsBadgeShaking(true), 0);
        const t2 = setTimeout(() => setIsBadgeShaking(false), 400);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [wrongClickId]);

    const previewIndex = useGameStore(s => s.previewIndex);
    const snap = previewIndex !== null && undoStack[previewIndex + 1]
        ? undoStack[previewIndex + 1]
        : null;

    const moveCount = snap ? snap.moveCount : liveMoveCount;
    const turn = snap ? snap.turn : liveTurn;
    const board = snap ? snap.board : liveBoard;
    const gameState = snap ? 'PREVIEW' : liveGameState;

    const [showHelp, setShowHelp] = useState(false);
    const [reviewMode, setReviewMode] = useState(false);

    useEffect(() => {

        if (liveGameState !== 'GAME_OVER') {
            setTimeout(() => setReviewMode(false), 0);
        }

        else {
            setReviewMode(suppressGameOverAnnouncer);
        }
    }, [liveGameState, suppressGameOverAnnouncer, notations]);

    const winner =
        liveGameState === 'GAME_OVER'
            ? board[15] > board[16]
                ? 'P1'
                : board[16] > board[15]
                    ? 'P2'
                    : 'Draw'
            : null;

    return (
        <div className="min-h-screen px-6 py-5 max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-5 h-[200px]">
                <div className="flex flex-col justify-between h-full">
                    <AnimatedHeader />
                    <p className="text-sm text-gray-500 max-w-sm">
                        <i className="text-black">The First Mathematical Dakon Solver.</i>
                        <br></br>
                        Evaluate any dakon board state, get algorithmic hints,
                        <br></br>
                        and learn how to beat any dakon setup.
                    </p>
                </div>
                <HeaderActions onHelpClick={() => setShowHelp(true)} />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                    { label: 'Moves Played', value: moveCount },
                    { label: 'Auto Hint', value: autoHint ? 'On' : 'Off' },
                    {
                        label: 'Solver Target',
                        value: solverTarget === 'current' ? 'Current player' : solverTarget,
                    },
                ].map(c => (
                    <div
                        key={c.label}
                        className={
                            "bg-white border-2 border-black px-4 py-3"
                            + " shadow-[3px_3px_0_#000] transition-all"
                        }
                    >
                        <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">
                            {c.label}
                        </div>
                        <div className="text-xl font-black text-gray-800 capitalize">
                            {c.value}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-center mb-5">
                <div
                    className={
                        "inline-flex items-center gap-2 bg-white px-4 py-1.5 border-2"
                        + " border-black shadow-[2px_2px_0_#000] text-xs font-bold"
                        + " text-gray-600 uppercase tracking-wide"
                    }
                >
                    Current Turn
                    <span
                        className={
                            "inline-flex items-center gap-1 px-2 py-0.5 text-[11px]"
                            + " font-black border-2 border-black text-white"
                            + ` ${isBadgeShaking ? 'wrong-click-shake' : ''}`
                        }
                        style={{
                            backgroundColor: turn === 'P1'
                                ? PLAYER_COLORS.p1[500]
                                : PLAYER_COLORS.p2[500]
                        }}
                    >
                        {turn}
                    </span>
                </div>
            </div>

            <div className="flex gap-6 items-start">
                <Controls />

                <div className="flex-1 flex flex-col items-center gap-5">
                    <GameBoard />

                    {gameState === 'CAPTURE_PROMPT' ? (
                        <div
                            className={
                                "bg-amber-50 border-2 border-black p-4"
                                + " shadow-[4px_4px_0_#000] max-w-xs w-full text-center"
                            }
                        >
                            <p className="font-bold text-sm mb-3">Capture?</p>
                            <div className="flex gap-2 justify-center">
                                <button
                                    onClick={captureNo}
                                    className={
                                        "px-6 py-2 text-sm font-bold border-2 border-black"
                                        + " bg-white hover:bg-stone-100 transition-colors"
                                    }
                                >
                                    No
                                </button>
                                <button
                                    onClick={captureYes}
                                    className={
                                        "px-6 py-2 text-sm font-bold border-2 border-black"
                                        + " bg-amber-400 hover:bg-amber-500 transition-colors"
                                    }
                                >
                                    Yes
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <>
                                <button
                                    onClick={solve}
                                    disabled={solverBusy}
                                    className={
                                        "w-full max-w-lg py-3 font-bold text-sm border-2"
                                        + " border-black shadow-[5px_5px_0_#000] transition-all"
                                        + " flex items-center justify-center gap-2"
                                        + ` ${solverBusy
                                            ? 'bg-emerald-800 text-white cursor-default opacity-50'
                                            : 'bg-emerald-800 text-white'
                                            + ' hover:translate-x-[2px] hover:translate-y-[2px]'
                                            + ' hover:shadow-[3px_3px_0_#000] hover:bg-emerald-900'
                                            + ' active:translate-x-[4px] active:translate-y-[4px]'
                                            + ' active:shadow-[1px_1px_0_#000]'
                                        }`
                                    }
                                >
                                    <span
                                        className={
                                            "w-4 h-4 rounded-full border-2 border-black"
                                            + ` ${solverStatus === 'THINKING'
                                                ? 'bg-amber-300 animate-[flicker_1s_ease-in-out_infinite]'
                                                : solverBusy ? 'bg-stone-400' : 'bg-white'
                                            }`
                                        }
                                    />
                                    {solverStatus === 'THINKING' ? 'Thinking...' : 'Calculate Best Move'}
                                </button>
                                <SolverReadout result={solverResult} status={solverStatus} />
                                <label
                                    className="flex items-center gap-2 text-xs font-bold select-none text-gray-600 cursor-pointer"
                                >
                                    <div
                                        className={
                                            "w-4 h-4 border-2 border-black flex items-center"
                                            + " justify-center transition-all"
                                            + ` ${autoHint
                                                ? 'bg-emerald-500 shadow-[2px_2px_0_#000]'
                                                : 'bg-white'
                                            }`
                                        }
                                    >
                                        {autoHint && (
                                            <span className="w-1.5 h-1.5 bg-white border border-black" />
                                        )}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={autoHint}
                                        onChange={e => setAutoHint(e.target.checked)}
                                        className="hidden"
                                    />
                                    Auto Hint
                                </label>
                            </>
                        </>
                    )}

                    <NotationTracker />
                </div>
            </div>

            {liveGameState === 'GAME_OVER' && !reviewMode && !suppressGameOverAnnouncer && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <div
                        className={
                            "p-10 border-4 border-black shadow-[8px_8px_0_#000]"
                            + " text-center max-w-sm w-full"
                            + ` ${winner === 'Draw' ? 'bg-[#E5E5CB]' : ''}`
                        }
                        style={
                            winner === 'P1'
                                ? { backgroundColor: '#24486E' }
                                : winner === 'P2'
                                    ? { backgroundColor: '#6E2424' }
                                    : {}
                        }
                    >
                        <h2
                            className={
                                "text-4xl font-black mb-3"
                                + ` ${winner === 'Draw' ? 'text-[#065F46]' : 'text-[#E5E5CB]'}`
                            }
                        >
                            {winner === 'Draw'
                                ? "It's a Draw!"
                                : winner === 'P1'
                                    ? "Player 1 wins!"
                                    : "Player 2 wins!"}
                        </h2>
                        <p
                            className={
                                "font-bold mb-6"
                                + ` ${winner === 'Draw' ? 'text-gray-700' : 'text-[#E5E5CB]'}`
                            }
                        >
                            P1 | {board[15]} – {board[16]} | P2
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => { setReviewMode(false); resetGame(); }}
                                className={
                                    "px-8 py-3 font-bold border-2 border-black"
                                    + " shadow-[4px_4px_0_#000] hover:translate-x-[2px]"
                                    + " hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000]"
                                    + " transition-all"
                                    + ` ${winner === 'Draw'
                                        ? 'bg-emerald-800 text-[#E5E5CB] hover:bg-emerald-900'
                                        : 'bg-[#E5E5CB] hover:bg-white'
                                    }`
                                }
                                style={
                                    winner === 'P1'
                                        ? { color: '#24486E' }
                                        : winner === 'P2'
                                            ? { color: '#6E2424' }
                                            : {}
                                }
                            >
                                New Game
                            </button>
                            <button
                                onClick={() => setReviewMode(true)}
                                className={
                                    "px-8 py-2 font-bold border-2 border-black"
                                    + " transition-all text-sm"
                                    + ` ${winner === 'Draw'
                                        ? 'bg-white text-[#065F46] hover:bg-stone-100'
                                        : 'bg-stone-900 text-[#E5E5CB] hover:bg-black'
                                    }`
                                }
                            >
                                Review Board
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
        </div>
    );
}
