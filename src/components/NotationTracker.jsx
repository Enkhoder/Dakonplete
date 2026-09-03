//////// IMPORTS ////////

import { playTurn, isLegalPick, captureYes, captureNo } from '../hooks/useDakonEngine';
import { Download, Upload, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { exportNotation, simulateGame } from '../utils/notationEngine';
import { useState, useRef, useEffect, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { PLAYER_COLORS } from '../utils/playerColors';
import { useGameStore } from '../store/gameStore';



//////// COMPONENTS ////////

export default function NotationTracker() {
    const notations = useGameStore(s => s.notations);
    const currentTurnNotation = useGameStore(s => s.currentTurnNotation);
    const setPreviewIndex = useGameStore(s => s.setPreviewIndex);
    const clearPreview = useGameStore(s => s.clearPreview);
    const previewIndex = useGameStore(s => s.previewIndex);
    const loadImportedGame = useGameStore(s => s.loadImportedGame);
    const isImportReview = useGameStore(s => s.isImportReview);
    const requestUndo = useGameStore(s => s.requestUndo);
    const requestRedo = useGameStore(s => s.requestRedo);
    const toastRequest = useGameStore(s => s.toastRequest);
    const triggerToast = useGameStore(s => s.triggerToast);
    const backLiveShakeId = useGameStore(s => s.backLiveShakeId);

    const [errorMsg, setErrorMsg] = useState(null);
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualText, setManualText] = useState('');
    const [localManualText, setLocalManualText] = useState('');
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [pendingImport, setPendingImport] = useState(null);
    const [placeholderOverride, setPlaceholderOverride] = useState(null);
    const [shakeTrigger, setShakeTrigger] = useState(0);
    const placeholderTimerRef = useRef(null);
    const inputUndoStack = useRef([]);
    const inputRedoStack = useRef([]);
    const lastCheckpoint = useRef('');
    const typingTimer = useRef(null);
    const liveMoveCount = useGameStore(s => s.moveCount);
    const isInitialBoard = useGameStore(s => {
        const board = s.board;
        return board[0] === 0 && board[15] === 0 && board[16] === 0 && board.slice(1, 15).every(v => v === 7);
    });

    const fileInputRef = useRef(null);
    const toastTimerRef = useRef(null);
    const [activeToast, setActiveToast] = useState(null);
    const [shakeActive, setShakeActive] = useState(false);

    useEffect(() => {
        if (!toastRequest) return;
        setActiveToast(prev => {
            if (prev && prev.text === toastRequest.text) {
                if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                toastTimerRef.current = setTimeout(() => setActiveToast(null), 2000);
                return prev;
            } else {
                if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                toastTimerRef.current = setTimeout(() => setActiveToast(null), 2000);
                return { text: toastRequest.text, type: toastRequest.type, id: toastRequest.id };
            }
        });
    }, [toastRequest]);

    useEffect(() => {
        if (backLiveShakeId === 0) return;
        setShakeActive(true);
        const t = setTimeout(() => setShakeActive(false), 400);
        return () => clearTimeout(t);
    }, [backLiveShakeId]);

    const undoStack = useGameStore(s => s.undoStack);
    const divergedNotationsLen = useGameStore(s => s.divergedNotations?.length ?? null);
    const divergedCurrentTurnNotation = useGameStore(s => s.divergedCurrentTurnNotation);

    const gameState = useGameStore(s => s.gameState);
    const board = useGameStore(s => s.board);
    const totalSnaps = undoStack.length;

    const isUndoing = divergedNotationsLen !== null;
    const isLive = previewIndex === null;

    const livePositionIdx = undoStack.length - 1;

    const targetSnapIdx = previewIndex !== null ? previewIndex : livePositionIdx;

    const isPrevDisabled = isUndoing || undoStack.length === 0 || previewIndex === 0
        || (!isImportReview && previewIndex === null && undoStack.length === 1);
    const isNextDisabled = isUndoing || undoStack.length === 0
        || (previewIndex === null && !isImportReview)
        || (previewIndex === undoStack.length - 1 && isImportReview);

    const rows = [];
    let globalMoveCounter = 0;

    const mapToken = (token, isCurrent = false) => {
        if (!token) return { parts: [], isCurrent };
        const parts = [...token.matchAll(/(\d+[p#]*)|(x[#]*)/g)].map(m => m[0]);
        const mappedParts = parts.map(part => {
            return { text: part, snapIdx: globalMoveCounter++ };
        });
        return { parts: mappedParts, isCurrent };
    };

    for (let i = 0; i < notations.length; i += 2) {
        rows.push({
            turnNum: Math.floor(i / 2) + 1,
            p1: mapToken(notations[i]),
            p2: mapToken(notations[i + 1]),
        });
    }

    const fullTimelineGameOver = notations.length > 0 ? notations[notations.length - 1].endsWith('#') : false;
    if (!fullTimelineGameOver) {
        const showPlaceholder = (isLive && !isUndoing && !isImportReview) || currentTurnNotation;
        if (showPlaceholder) {
            if (notations.length % 2 === 0) {
                rows.push({
                    turnNum: Math.floor(notations.length / 2) + 1,
                    p1: mapToken(currentTurnNotation || '', true),
                    p2: mapToken('', false),
                });
            } else {
                rows[rows.length - 1].p2 = mapToken(currentTurnNotation || '', true);
            }
        }
    }

    let activeCellIdx = -1;
    if (targetSnapIdx === -1) {
        activeCellIdx = notations.length;
    } else {
        for (let i = 0; i < rows.length; i++) {
            if (rows[i].p1.parts.some(p => p.snapIdx === targetSnapIdx)) {
                activeCellIdx = i * 2;
                break;
            }
            if (rows[i].p2.parts.some(p => p.snapIdx === targetSnapIdx)) {
                activeCellIdx = i * 2 + 1;
                break;
            }
        }
    }

    if (activeCellIdx === -1) activeCellIdx = notations.length;

    const activeTurnNum = Math.floor(activeCellIdx / 2) + 1;
    const activeIsP1 = activeCellIdx % 2 === 0;

    const handleCellClick = (cellData) => {
        if (isUndoing || !cellData || cellData.parts.length === 0) return;
        const parts = cellData.parts;
        const curIdx = parts.findIndex(p => p.snapIdx === previewIndex);

        if (curIdx !== -1) {
            const nextIdx = (curIdx + 1) % parts.length;
            const nextSnap = parts[nextIdx].snapIdx;
            if (nextSnap === totalSnaps - 1) clearPreview();
            else setPreviewIndex(nextSnap);
        } else {
            const firstSnap = parts[0].snapIdx;
            if (firstSnap === totalSnaps - 1) clearPreview();
            else setPreviewIndex(firstSnap);
        }
    };

    const renderCell = (cellData, isP1) => {
        if (!cellData || cellData.parts.length === 0) return null;
        return (
            <div className={`flex flex-wrap gap-0 ${isP1 ? 'justify-end' : 'justify-start'}`}>
                {cellData.parts.map((item, i) => {
                    const isAtLivePos = item.snapIdx === livePositionIdx;
                    const isPreview = previewIndex === item.snapIdx;
                    const isUndone = isUndoing && item.snapIdx > livePositionIdx;

                    let colorClass = 'text-gray-800';
                    if (isAtLivePos && isLive) colorClass = 'bg-yellow-300 text-black font-bold';
                    else if (isPreview) colorClass = 'bg-amber-200 text-black font-bold';
                    else if (isUndone) colorClass = 'text-gray-400';

                    return (
                        <span
                            key={i}
                            className={`transition-colors tracking-wider ${colorClass}`}
                        >
                            {item.text}
                        </span>
                    );
                })}
                {cellData.isCurrent && (currentTurnNotation || divergedCurrentTurnNotation) && <span className="text-gray-400">...</span>}
            </div>
        );
    };

    const handleDownload = () => {
        if (notations.length === 0) return;
        const txt = gameState === 'GAME_OVER' ? exportNotation(notations, board[15], board[16]) : exportNotation(notations);
        const blob = new Blob([txt], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const d = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const timestamp = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
            + `_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;

        let suffix = '';
        if (gameState === 'GAME_OVER') {
            const p1 = board[15];
            const p2 = board[16];
            if (p1 > p2) suffix = '_P1';
            else if (p2 > p1) suffix = '_P2';
            else suffix = '_D';
        }

        a.href = url;
        a.download = `Dakonplete_${timestamp}${suffix}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleCopy = () => {
        if (notations.length === 0) return;
        let lines = [];
        for (let i = 0; i < notations.length; i += 2) {
            const p1 = notations[i];
            const p2 = notations[i + 1] ? " " + notations[i + 1] : "";
            lines.push(p1 + p2);
        }
        navigator.clipboard.writeText(lines.join('\n'));
        triggerToast('Copied to clipboard!', 'success');
    };

    useEffect(() => () => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        if (placeholderTimerRef.current) clearTimeout(placeholderTimerRef.current);
    }, []);

    useEffect(() => {
        const parts = [...notations];
        if (currentTurnNotation) parts.push(currentTurnNotation);
        const canonical = parts.join(' ');
        setManualText(prev => {
            if (canonical !== prev) {
                setLocalManualText(canonical);
                return canonical;
            }
            return prev;
        });
    }, [notations, currentTurnNotation]);

    useEffect(() => {
        if (!showManualInput) setShakeTrigger(0);
    }, [showManualInput]);

    useEffect(() => {
        if (showManualInput) {
            inputUndoStack.current = [];
            inputRedoStack.current = [];
            lastCheckpoint.current = localManualText;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showManualInput]);

    const handlePrev = useCallback(() => {
        if (undoStack.length === 0) return;
        if (previewIndex === null) {
            if (!isImportReview && undoStack.length > 1) {
                setPreviewIndex(undoStack.length - 2);
            } else if (isImportReview) {
                setPreviewIndex(undoStack.length - 1);
            }
        } else if (previewIndex > 0) {
            setPreviewIndex(previewIndex - 1);
        }
    }, [undoStack, previewIndex, isImportReview, setPreviewIndex]);

    const handleNext = useCallback(() => {
        if (previewIndex === null) return;
        if (!isImportReview && previewIndex >= undoStack.length - 2) {
            clearPreview();
        } else if (previewIndex === undoStack.length - 1) {
            if (!isImportReview) clearPreview();
        } else {
            setPreviewIndex(previewIndex + 1);
        }
    }, [previewIndex, isImportReview, undoStack.length, clearPreview, setPreviewIndex]);

    const handlePrevRequest = useCallback(() => {
        if (isUndoing) {
            triggerToast("Make a move or redo the whole game to peek.", "error");
        } else if (isPrevDisabled) {
            triggerToast("You've reached the top.", "error");
        } else {
            handlePrev();
        }
    }, [isUndoing, isPrevDisabled, triggerToast, handlePrev]);

    const handleNextRequest = useCallback(() => {
        if (isUndoing) {
            triggerToast("Make a move or redo the whole game to peek.", "error");
        } else if (isNextDisabled) {
            triggerToast("This is where we are now.", "error");
        } else {
            handleNext();
        }
    }, [isUndoing, isNextDisabled, triggerToast, handleNext]);

    const handleCaptureKey = useCallback((takeCapture) => {
        const s = useGameStore.getState();

        if (s.gameState !== 'CAPTURE_PROMPT' || s.pendingCapture === null) return false;
        if (s.isImportReview || s.previewIndex !== null) return false;
        if (s.gameMode === 'PVE' && s.turn !== s.humanSide) return false;

        if (takeCapture) captureYes();
        else captureNo();

        return true;
    }, []);

    const handleCupKey = useCallback((digit) => {
        const s = useGameStore.getState();

        if (s.isImportReview || s.previewIndex !== null) return;
        if (s.gameState !== 'IDLE' && s.gameState !== 'FREE_PICK') return;
        if (s.gameMode === 'PVE' && s.turn !== s.humanSide) return;

        const cup = s.turn === 'P1' ? digit : digit + 7;

        if (isLegalPick(cup)) playTurn(cup);
        else s.triggerWrongClick();
    }, []);

    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if ((e.key === 'Enter' || e.key === 'Escape') && handleCaptureKey(e.key === 'Enter')) {
                e.preventDefault();
                return;
            }

            const isUndo = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z';
            const isRedo = ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
                ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z');

            if (isUndo) {
                e.preventDefault();
                requestUndo();
            } else if (isRedo) {
                e.preventDefault();
                requestRedo();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrevRequest();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNextRequest();
            } else if (/^[1-7]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                handleCupKey(Number(e.key));
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [requestUndo, requestRedo, handlePrevRequest, handleNextRequest, handleCupKey, handleCaptureKey]);

    const processImport = (text, fromFile = false) => {
        setErrorMsg(null);

        if (!isImportReview && (!isInitialBoard || liveMoveCount > 0)) {
            setPendingImport({ text, fromFile });
            return;
        }

        performImport(text, fromFile);
    };

    const performImport = (text, fromFile = false) => {
        setErrorMsg(null);

        if (!text || !text.trim()) {
            setErrorMsg('Import failed: Nothing to import.');
            return;
        }

        const res = simulateGame(text);

        if (res.error) {
            if (res.validTo !== undefined) {
                const moves = res.validTo.reduce((acc, t) => acc + [...t.matchAll(/\d+/g)].length, 0);
                const turns = res.validTo.length;
                const moveWord = moves === 1 ? 'move' : 'moves';
                const turnWord = turns === 1 ? 'turn' : 'turns';

                if (turns > 0) {
                    setErrorMsg(`Import halted: ${res.error}.\nLoaded ${moves} ${moveWord} from ${turns} ${turnWord}.`);
                } else {
                    setErrorMsg(`Import halted: ${res.error}.\nNo moves loaded.`);
                    return;
                }
            } else {
                setErrorMsg(`Import failed: ${res.error}.`);
                return;
            }
        }

        loadImportedGame(
            res.historyStr || res.validTo,
            res.undoStack,
            res.board,
            res.seeds,
            res.turn,
            res.moveCount,
            res.gameState,
            res.currentTurnNotation
        );

        if (!res.error || fromFile) {
            const history = res.historyStr || res.validTo || [];
            const inProgress = res.currentTurnNotation || '';
            const parts = [...history];
            if (inProgress) parts.push(inProgress);
            const oneLined = parts.join(' ');
            setManualText(oneLined);
            setLocalManualText(oneLined);
        }
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            processImport(event.target.result, true);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <div className="w-full max-w-lg mt-4 bg-white border-2 border-black shadow-[4px_4px_0_#000]">
            {pendingImport && (
                <div className="fixed inset-0 bg-black/20 z-[300] flex items-center justify-center">
                    <div className="bg-amber-50 border-2 border-black p-5 shadow-[4px_4px_0_#000] w-64 text-center">
                        <h3 className="font-bold text-black mb-2">Reset Game?</h3>
                        <p className="text-xs text-gray-800 mb-4">Importing a match will reset the current game. Proceed?</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPendingImport(null)}
                                className="flex-1 py-1.5 text-xs font-bold border-2 border-black bg-white hover:bg-stone-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    performImport(pendingImport.text, pendingImport.fromFile);
                                    setPendingImport(null);
                                }}
                                className="flex-1 py-1.5 text-xs font-bold border-2 border-black bg-red-400 text-white hover:bg-red-500 transition-colors"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center p-3 border-b-2 border-black bg-stone-50 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                    <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">
                        Game Review
                    </h3>
                    {(previewIndex !== null && !isImportReview) && (
                        <button
                            onClick={() => {
                                clearPreview();
                            }}
                            className={
                                `flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold bg-amber-400`
                                + ` border-2 border-black text-black hover:bg-amber-500 transition-colors`
                                + ` ${shakeActive ? 'wrong-click-shake' : ''}`
                            }
                        >
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-[flicker_1s_ease-in-out_infinite]" />
                            Back to live pos.
                        </button>
                    )}
                </div>
                <div className="flex gap-2">
                    <div className="flex items-center">
                        <button
                            onClick={handlePrevRequest}
                            className={`flex items-center justify-center w-7 h-7 bg-white border-2 relative ${isPrevDisabled
                                ? 'border-gray-300 text-gray-400 bg-stone-50 z-0'
                                : 'border-black text-black hover:bg-emerald-100 z-10 transition-all'
                                }`}
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <button
                            onClick={handleNextRequest}
                            className={`flex items-center justify-center w-7 h-7 bg-white border-2 -ml-[2px] relative ${isNextDisabled
                                ? 'border-gray-300 text-gray-400 bg-stone-50 z-0'
                                : 'border-black text-black hover:bg-emerald-100 z-10 transition-all'
                                }`}
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>

                    <div className="relative group">
                        <button
                            disabled={notations.length === 0}
                            className={`flex items-center gap-1 px-3 py-1 text-[11px] font-bold border-2 transition-colors ${notations.length === 0
                                ? 'bg-stone-50 border-gray-300 text-gray-400 cursor-default'
                                : 'bg-white border-black text-black group-hover:bg-emerald-100'
                                }`}
                        >
                            <Download size={12} />
                            Export
                        </button>
                        {notations.length > 0 && (
                            <div
                                className={
                                    `absolute right-0 top-full mt-1 w-36 bg-white border-2 border-black shadow-[3px_3px_0_#000]`
                                    + ` flex opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all`
                                    + ` group-hover:delay-0 flex-col z-50 after:absolute after:-top-2 after:left-0 after:h-2 after:w-full`
                                }
                            >
                                <button
                                    onClick={handleDownload}
                                    className="px-3 py-2 text-xs font-bold hover:bg-stone-100 text-left border-b-2 border-black"
                                >
                                    Save as .txt
                                </button>
                                <button
                                    onClick={handleCopy}
                                    className="px-3 py-2 text-xs font-bold hover:bg-stone-100 text-left flex items-center gap-1.5"
                                >
                                    Copy to Clipboard
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="fixed inset-x-0 bottom-10 flex justify-center z-[200] pointer-events-none">
                        <AnimatePresence mode="wait">
                            {activeToast && (
                                <motion.div
                                    key={activeToast.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -12 }}
                                    transition={{ duration: 0.2 }}
                                    className={
                                        `flex items-center gap-2 px-4 py-2.5 text-white text-xs font-bold`
                                        + ` border-2 border-black shadow-[3px_3px_0_#000]`
                                        + ` ${activeToast.type === 'error' ? 'bg-red-600' : 'bg-emerald-700'}`
                                    }
                                >
                                    {activeToast.type === 'success' ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
                                    {activeToast.text}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="relative group">
                        <button
                            className={
                                `flex items-center gap-1 px-3 py-1 text-[11px] font-bold bg-black text-white`
                                + ` border-2 border-black group-hover:bg-emerald-800 transition-colors`
                            }
                        >
                            <Upload size={12} />
                            Import
                        </button>
                        <div
                            className={
                                `absolute right-0 top-full mt-1 w-36 bg-white border-2 border-black shadow-[3px_3px_0_#000]`
                                + ` flex opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all`
                                + ` group-hover:delay-0 flex-col z-50 text-black after:absolute after:-top-2 after:left-0`
                                + ` after:h-2 after:w-full`
                            }
                        >
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-3 py-2 text-xs font-bold hover:bg-stone-100 text-left border-b-2 border-black"
                            >
                                From .txt
                            </button>
                            <button
                                onClick={() => {
                                    if (showManualInput) {
                                        setShakeTrigger(prev => prev + 1);
                                    } else {
                                        setLocalManualText(manualText);
                                        setShowManualInput(true);
                                    }
                                }}
                                className="px-3 py-2 text-xs font-bold hover:bg-stone-100 text-left"
                            >
                                Type Manually
                            </button>
                        </div>
                        <input
                            type="file"
                            accept=".txt"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleImport}
                        />
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {errorMsg && (
                    <motion.div
                        key="error-msg"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.1, ease: "easeInOut" }}
                        className={`bg-amber-50 overflow-hidden ${!showManualInput ? 'border-b-2 border-black' : ''}`}
                    >
                        <div className={`p-3 ${showManualInput ? 'pb-0' : ''}`}>
                            <div className="p-3 bg-red-100 border-2 border-red-500 text-red-700 text-xs font-bold flex justify-between items-start gap-2">
                                <span className="min-w-0 flex-1 whitespace-pre-line [overflow-wrap:anywhere]">{errorMsg}</span>
                                <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-800 flex-shrink-0">
                                    <X size={14} strokeWidth={3} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {showManualInput && (
                <div className="p-3 border-b-2 border-black bg-amber-50">
                    <div
                        key={shakeTrigger}
                        className={`relative ${shakeTrigger > 0 ? 'wrong-click-shake' : ''}`}
                    >
                        <textarea
                            value={localManualText}
                            onChange={(e) => {
                                const val = e.target.value;
                                setLocalManualText(val);

                                if (inputRedoStack.current.length > 0) {
                                    inputRedoStack.current = [];
                                }

                                if (typingTimer.current) clearTimeout(typingTimer.current);
                                typingTimer.current = setTimeout(() => {
                                    if (val !== lastCheckpoint.current) {
                                        inputUndoStack.current.push(lastCheckpoint.current);
                                        lastCheckpoint.current = val;
                                    }
                                }, 500);
                            }}
                            onKeyDown={(e) => {
                                const isUndo = (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z';
                                const isRedo = ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
                                    ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z');

                                if (isUndo) {
                                    e.preventDefault();
                                    if (typingTimer.current) clearTimeout(typingTimer.current);
                                    if (localManualText !== lastCheckpoint.current) {
                                        inputRedoStack.current.push(localManualText);
                                        setLocalManualText(lastCheckpoint.current);
                                    } else if (inputUndoStack.current.length > 0) {
                                        inputRedoStack.current.push(lastCheckpoint.current);
                                        const prev = inputUndoStack.current.pop();
                                        setLocalManualText(prev);
                                        lastCheckpoint.current = prev;
                                    }
                                } else if (isRedo) {
                                    e.preventDefault();
                                    if (typingTimer.current) clearTimeout(typingTimer.current);
                                    if (inputRedoStack.current.length > 0) {
                                        const next = inputRedoStack.current.pop();
                                        inputUndoStack.current.push(lastCheckpoint.current);
                                        setLocalManualText(next);
                                        lastCheckpoint.current = next;
                                    }
                                }
                            }}
                            className="w-full h-24 p-2 text-sm border-2 border-black resize-none focus:outline-none bg-white relative z-10"
                            style={{ fontFamily: '"Consolas", monospace' }}
                            spellCheck="false"
                        />
                        {(placeholderOverride || !localManualText) && (
                            <div
                                className="absolute top-2.5 left-2.5 text-sm text-gray-400 pointer-events-none z-20"
                                style={{ fontFamily: '"Consolas", monospace' }}
                            >
                                {placeholderOverride || "e.g. 2x 9 5p2 10p8x ..."}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <button
                            onClick={() => {
                                const isMeaningful = localManualText.trim().length > 0;

                                if (isMeaningful) {
                                    setShowClearConfirm(prev => !prev);
                                } else {
                                    if (placeholderTimerRef.current) clearTimeout(placeholderTimerRef.current);
                                    setPlaceholderOverride("Nothing to clear.");
                                    placeholderTimerRef.current = setTimeout(() => setPlaceholderOverride(null), 1000);
                                }
                            }}
                            className={`px-3 py-1 text-xs font-bold border-2 transition-all ${localManualText.trim().length > 0
                                ? 'border-red-500 text-red-600 bg-white hover:bg-red-100 active:scale-95 transition-all'
                                : 'border-gray-300 text-gray-300 bg-stone-50 cursor-default'
                                }`}
                        >
                            Clear
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setShowManualInput(false); setErrorMsg(null); setLocalManualText(manualText); }}
                                className="px-3 py-1 text-xs font-bold border-2 border-black bg-white hover:bg-amber-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const isMeaningful = localManualText.trim().length > 0;
                                    if (isMeaningful) {
                                        setManualText(localManualText);
                                        processImport(localManualText);
                                    } else {
                                        if (placeholderTimerRef.current) clearTimeout(placeholderTimerRef.current);
                                        setPlaceholderOverride("Nothing to import.");
                                        placeholderTimerRef.current = setTimeout(() => setPlaceholderOverride(null), 1000);
                                    }
                                }}
                                className="px-3 py-1 text-xs font-bold border-2 border-black bg-emerald-700 text-white hover:bg-emerald-800 transition-all"
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                    {showClearConfirm && (
                        <div
                            className={
                                `mt-3 bg-white border-2 border-black p-3 shadow-[3px_3px_0_#000] text-center`
                                + ` animate-in fade-in zoom-in duration-200`
                            }
                        >
                            <p className="text-xs font-bold text-gray-700 mb-2">Clear all manual input? This won't affect the game.</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowClearConfirm(false)}
                                    className="flex-1 py-1 text-xs font-bold border-2 border-black bg-white hover:bg-stone-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setLocalManualText('');
                                        setManualText('');
                                        setShowClearConfirm(false);
                                    }}
                                    className={
                                        `flex-1 py-1 text-xs font-bold border-2 border-black bg-red-400 text-white`
                                        + ` hover:bg-red-500 transition-colors`
                                    }
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="w-full p-0">
                <table className="w-full text-left text-sm cursor-default">
                    <thead
                        className={
                            `bg-stone-100 sticky top-0 border-b-2 border-black text-xs uppercase`
                            + ` tracking-widest text-gray-500 font-bold z-10`
                        }
                    >
                        <tr>
                            <th className="px-4 py-2 w-16 border-r-2 border-black text-center">#</th>
                            <th
                                className="px-4 py-2 w-1/2 border-r-2 border-black text-right"
                                style={{ color: PLAYER_COLORS.p1[500] }}
                            >
                                Player 1
                            </th>
                            <th
                                className="px-4 py-2 w-1/2"
                                style={{ color: PLAYER_COLORS.p2[500] }}
                            >
                                Player 2
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {rows.map((row) => {
                            const p1Active = isLive && row.turnNum === activeTurnNum && activeIsP1;
                            const p2Active = isLive && row.turnNum === activeTurnNum && !activeIsP1;
                            return (
                                <tr key={row.turnNum} className="border-b-[1px] border-gray-200 hover:bg-amber-50 transition-colors">
                                    <td className="px-4 py-2 border-r-2 border-black text-gray-400 font-bold text-center">
                                        {row.turnNum}.
                                    </td>
                                    <td
                                        className={
                                            `px-4 py-2 border-r-2 border-black transition-colors`
                                            + ` ${row.p1.parts.length > 0 ? 'cursor-pointer hover:bg-yellow-100' : ''}`
                                            + ` ${p1Active ? 'bg-yellow-50' : ''}`
                                        }
                                        onClick={() => handleCellClick(row.p1)}
                                    >
                                        {renderCell(row.p1, true)}
                                    </td>
                                    <td
                                        className={
                                            `px-4 py-2 transition-colors`
                                            + ` ${row.p2.parts.length > 0 ? 'cursor-pointer hover:bg-yellow-100' : ''}`
                                            + ` ${p2Active ? 'bg-yellow-50' : ''}`
                                        }
                                        onClick={() => handleCellClick(row.p2)}
                                    >
                                        {renderCell(row.p2, false)}
                                    </td>
                                </tr>
                            )
                        })}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-4 py-8 text-center text-gray-400 font-bold italic text-xs">
                                    No moves made yet
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}