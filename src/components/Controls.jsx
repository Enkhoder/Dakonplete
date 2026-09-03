//////// IMPORTS ////////

import { Undo2, Redo2, RotateCcw } from 'lucide-react';
import { PLAYER_COLORS } from '../utils/playerColors';
import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';



//////// COMPONENTS ////////

const Toggle = ({ on, onClick, disabled, activeColor = '#10B981' }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={
            `w-10 h-[22px] transition-colors relative border-2 border-black shadow-[2px_2px_0_#000]`
            + ` ${disabled ? 'opacity-50 pointer-events-none' : ''}`
        }
        style={{ backgroundColor: on ? activeColor : '#E5E7EB' }}
    >
        <div
            className="w-4 h-4 bg-white border border-black absolute top-[1px] transition-all"
            style={{ left: on ? 18 : 2 }}
        />
    </button>
);


const SpeedSlider = ({ value, min, max, step, onChange }) => {
    const trackRef = useRef(null);
    const isDragging = useRef(false);

    useEffect(() => {
        const handleMouseMove = (e) => {

            if (!isDragging.current || !trackRef.current) return;

            const rect = trackRef.current.getBoundingClientRect();
            let x = e.clientX - rect.left;

            if (x < 0) x = 0;

            if (x > rect.width) x = rect.width;

            const percentage = x / rect.width;
            const rawValue = percentage * (max - min) + min;
            const stepped = Math.round(rawValue / step) * step;
            onChange(stepped);
        };

        const handleMouseUp = () => {
            isDragging.current = false;
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [max, min, step, onChange]);

    const updateValue = (clientX) => {

        if (!trackRef.current) return;

        const rect = trackRef.current.getBoundingClientRect();
        let x = clientX - rect.left;

        if (x < 0) x = 0;

        if (x > rect.width) x = rect.width;

        const percentage = x / rect.width;
        const rawValue = percentage * (max - min) + min;
        const stepped = Math.round(rawValue / step) * step;
        onChange(stepped);
    };

    const handleTrackMouseDown = (e) => {
        updateValue(e.clientX);
        isDragging.current = true;
    };

    const handleThumbMouseDown = (e) => {
        e.stopPropagation();
        isDragging.current = true;
    };

    const percent = ((value - min) / (max - min)) * 100;

    return (
        <div
            className={
                "w-full h-2 bg-[#DDD] border-2 border-black relative"
                + " cursor-pointer my-2 shadow-[2px_2px_0_#000]"
            }
            ref={trackRef}
            onMouseDown={handleTrackMouseDown}
        >
            <div
                className={
                    "absolute top-1/2 -translate-y-1/2 flex items-center justify-center"
                    + " bg-emerald-500 border-2 border-black cursor-grab"
                    + " active:cursor-grabbing hover:scale-110"
                    + " transition-transform shadow-[2px_2px_0_#000]"
                }
                style={{
                    left: `calc(${percent}% - 10px)`,
                    width: '20px',
                    height: '20px'
                }}
                onMouseDown={handleThumbMouseDown}
            >
                <div className="w-2 h-2 bg-white border-[1.5px] border-black pointer-events-none" />
            </div>
        </div>
    );
};


export default function Controls() {
    const liveMoveCount = useGameStore(s => s.moveCount);
    const requestUndo = useGameStore(s => s.requestUndo);
    const requestRedo = useGameStore(s => s.requestRedo);
    const resetGame = useGameStore(s => s.resetGame);
    const undoStack = useGameStore(s => s.undoStack);
    const redoStack = useGameStore(s => s.redoStack);
    const gameState = useGameStore(s => s.gameState);

    const previewIndex = useGameStore(s => s.previewIndex);
    const isImportReview = useGameStore(s => s.isImportReview);
    const board = useGameStore(s => s.board);

    const snap = previewIndex !== null && undoStack[previewIndex + 1]
        ? undoStack[previewIndex + 1]
        : null;
    const moveCount = snap ? snap.moveCount : liveMoveCount;

    const gameMode = useGameStore(s => s.gameMode);
    const setMode = useGameStore(s => s.setMode);
    const humanSide = useGameStore(s => s.humanSide);
    const setSide = useGameStore(s => s.setSide);
    const speed = useGameStore(s => s.speed);
    const setSpeed = useGameStore(s => s.setSpeed);
    const autoHint = useGameStore(s => s.autoHint);
    const setAutoHint = useGameStore(s => s.setAutoHint);
    const p1AutoCapture = useGameStore(s => s.p1AutoCapture);
    const p2AutoCapture = useGameStore(s => s.p2AutoCapture);
    const setP1AutoCapture = useGameStore(s => s.setP1AutoCapture);
    const setP2AutoCapture = useGameStore(s => s.setP2AutoCapture);
    const solverTarget = useGameStore(s => s.solverTarget);
    const setSolverTarget = useGameStore(s => s.setSolverTarget);

    const busy = gameState === 'ANIMATING';

    const undoDisabled = busy || !undoStack.length || isImportReview || previewIndex !== null;
    const redoDisabled = busy || !redoStack.length || isImportReview || previewIndex !== null;

    const isInitialBoard = (
        board[0] === 0 && board[15] === 0 && board[16] === 0
        && board.slice(1, 15).every(v => v === 7)
    );
    const resetDisabled = undoDisabled && redoDisabled && isInitialBoard;

    const [pendingChange, setPendingChange] = useState(null);
    const [resetPending, setResetPending] = useState(false);

    const handleModeChange = (m) => {

        if (gameMode === m) return;

        if (moveCount > 0) setPendingChange({ type: 'MODE', value: m });

        else setMode(m);
    };

    const handleSideChange = (s) => {

        if (humanSide === s) return;

        if (moveCount > 0) setPendingChange({ type: 'SIDE', value: s });

        else setSide(s);
    };

    const confirmChange = () => {

        if (pendingChange.type === 'MODE') setMode(pendingChange.value);

        if (pendingChange.type === 'SIDE') setSide(pendingChange.value);

        setPendingChange(null);
    };

    const handleReset = () => {
        setResetPending(prev => !prev);
    };

    const confirmReset = () => {
        setResetPending(false);

        if (busy) {
            useGameStore.setState({ resetRequested: true });
        }

        else {
            resetGame();
        }
    };

    const pill = (active, hoverClass = 'hover:bg-emerald-100', disabled = false) =>
        `flex-1 py-1.5 text-xs font-bold transition-all border-2`
        + ` ${disabled ? 'opacity-50 pointer-events-none cursor-default' : ''}`
        + ` ${active
            ? 'bg-black text-white border-black'
            : `bg-white text-gray-600 border-black ${hoverClass}`
        }`;

    return (
        <div
            className="w-72 flex flex-col gap-4 shrink-0"
            style={{
                '--p1-100': PLAYER_COLORS.p1[100],
                '--p1-500': PLAYER_COLORS.p1[500],
                '--p2-100': PLAYER_COLORS.p2[100],
                '--p2-500': PLAYER_COLORS.p2[500],
            }}
        >
            {pendingChange && (
                <div className="fixed inset-0 bg-black/20 z-[300] flex items-center justify-center">
                    <div className="bg-amber-50 border-2 border-black p-5 shadow-[4px_4px_0_#000] w-64 text-center">
                        <h3 className="font-bold text-black mb-2">Reset Game?</h3>
                        <p className="text-xs text-gray-800 mb-4">
                            Changing settings will reset the game. Proceed?
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPendingChange(null)}
                                className={
                                    "flex-1 py-1.5 text-xs font-bold border-2 border-black"
                                    + " bg-white hover:bg-stone-100 transition-colors"
                                }
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmChange}
                                className={
                                    "flex-1 py-1.5 text-xs font-bold border-2 border-black"
                                    + " bg-red-400 text-white hover:bg-red-500 transition-colors"
                                }
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0_#000]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-800 text-sm">Controls</h3>
                    <span className="text-xs text-gray-400">
                        Move{' '}
                        <span className="font-bold text-gray-800">{moveCount}</span>
                    </span>
                </div>

                <div className="flex gap-2 mb-3">
                    <button
                        onClick={requestUndo}
                        className={
                            "flex-1 flex items-center justify-center gap-1 py-2 text-xs"
                            + " font-bold border-2 border-black bg-white transition-colors"
                            + ` ${undoDisabled ? 'opacity-50 cursor-default' : 'hover:bg-amber-100'}`
                        }
                    >
                        <Undo2 size={14} /> Undo
                    </button>
                    <button
                        onClick={requestRedo}
                        className={
                            "flex-1 flex items-center justify-center gap-1 py-2 text-xs"
                            + " font-bold border-2 border-black bg-white transition-colors"
                            + ` ${redoDisabled ? 'opacity-50 cursor-default' : 'hover:bg-amber-100'}`
                        }
                    >
                        <Redo2 size={14} /> Redo
                    </button>
                </div>

                <button
                    onClick={resetDisabled ? undefined : handleReset}
                    disabled={resetDisabled}
                    className={
                        "w-full flex items-center justify-center gap-1.5 py-2.5 text-xs"
                        + " font-bold border-2 transition-all"
                        + ` ${resetDisabled
                            ? 'border-red-500 text-red-600 bg-white cursor-default opacity-50'
                            : 'border-red-500 text-red-600 bg-white hover:bg-red-100'
                        }`
                    }
                >
                    <RotateCcw size={14} /> Reset Board
                </button>

                {resetPending && (
                    <div className="mt-3 bg-amber-50 border-2 border-black p-3 shadow-[3px_3px_0_#000] text-center">
                        <p className="text-xs font-bold text-gray-800 mb-2">
                            Are you sure you want to reset the current game?
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setResetPending(false)}
                                className={
                                    "flex-1 py-1 text-xs font-bold border-2 border-black"
                                    + " bg-white hover:bg-stone-100 transition-colors"
                                }
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmReset}
                                className={
                                    "flex-1 py-1 text-xs font-bold border-2 border-black"
                                    + " bg-red-400 text-white hover:bg-red-500 transition-colors"
                                }
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0_#000]">
                <h3 className="font-bold text-gray-800 text-[11px] uppercase tracking-wider mb-3">
                    Game Settings
                </h3>

                <label className="text-[11px] font-bold text-gray-500 mb-1 block">Mode</label>
                <div className="flex mb-3">
                    {[
                        { id: 'PVP', label: 'Multiplayer' },
                        { id: 'PVE', label: 'vs. Bot' }
                    ].map(m => (
                        <button
                            key={m.id}
                            onClick={() => handleModeChange(m.id)}
                            className={pill(gameMode === m.id)}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                {gameMode === 'PVE' && (
                    <>
                        <label className="text-[11px] font-bold text-gray-500 mb-1 block">
                            Play as
                        </label>
                        <div className="flex mb-3">
                            {['P1', 'P2'].map(v => (
                                <button
                                    key={v}
                                    onClick={() => handleSideChange(v)}
                                    className={pill(
                                        humanSide === v,
                                        v === 'P1'
                                            ? 'hover:bg-[var(--p2-100)]'
                                            : 'hover:bg-[var(--p1-100)]'
                                    )}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                    </>
                )}

                <div className="flex items-center justify-between mb-3 mt-4 border-t-2 border-black pt-3">
                    <span className="text-xs font-bold" style={{ color: 'var(--p1-500)' }}>
                        P1 Auto-Capture
                    </span>
                    <Toggle
                        on={p1AutoCapture}
                        activeColor="var(--p1-500)"
                        onClick={() => setP1AutoCapture(!p1AutoCapture)}
                        disabled={gameMode === 'PVE'}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: 'var(--p2-500)' }}>
                        P2 Auto-Capture
                    </span>
                    <Toggle
                        on={p2AutoCapture}
                        activeColor="var(--p2-500)"
                        onClick={() => setP2AutoCapture(!p2AutoCapture)}
                        disabled={gameMode === 'PVE'}
                    />
                </div>
            </div>

            <div className="bg-white border-2 border-black p-5 shadow-[4px_4px_0_#000]">
                <h3 className="font-bold text-gray-800 text-[11px] uppercase tracking-wider mb-3">
                    Solver Settings
                </h3>

                <div className="flex items-center justify-between mb-4">
                    <span
                        className={
                            `text-xs font-bold transition-colors`
                            + ` ${gameMode === 'PVP' ? 'text-gray-400' : 'text-gray-500'}`
                        }
                    >
                        Auto Hint
                    </span>
                    <Toggle
                        on={autoHint}
                        onClick={() => setAutoHint(!autoHint)}
                        disabled={gameMode === 'PVP'}
                    />
                </div>

                <label
                    className={
                        `text-[11px] font-bold mb-1 block transition-colors`
                        + ` ${gameMode === 'PVP' ? 'text-gray-400' : 'text-gray-500'}`
                    }
                >
                    Solve for
                </label>
                <div className="flex mb-4">
                    {['current', 'P1', 'P2'].map(t => (
                        <button
                            key={t}
                            onClick={() => setSolverTarget(t)}
                            disabled={gameMode === 'PVP'}
                            className={pill(
                                solverTarget === t,
                                t === 'current' ? 'hover:bg-amber-100' :
                                    t === 'P1' ? 'hover:bg-[var(--p2-100)]' :
                                        'hover:bg-[var(--p1-100)]',
                                gameMode === 'PVP'
                            )}
                        >
                            {t === 'current' ? 'Current' : t}
                        </button>
                    ))}
                </div>

                <label className="text-[11px] font-bold text-gray-500 mb-4 block">
                    Speed: {speed === 0 ? 'Instant' : `${speed}ms`}
                </label>
                <SpeedSlider
                    min={0} max={500} step={50}
                    value={speed}
                    onChange={(val) => {

                        if (val === 0 && busy) setSpeed(50);

                        else setSpeed(val);
                    }}
                />
            </div>
        </div>
    );
}
