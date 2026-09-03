//////// IMPORTS ////////

// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { PLAYER_COLORS } from '../utils/playerColors';
import { useState, useEffect, useRef } from 'react';
import { SEED_COLORS } from '../utils/seedTheme';
import { X, ChevronDown } from 'lucide-react';



//////// CONSTANTS ////////

const CODE_STYLE = 'bg-stone-100 px-1 font-mono text-xs';



//////// UTILITIES ////////

function off(i, n, r) {
    if (n === 1) return { x: 0, y: 0 };
    const a = (2 * Math.PI * i) / n - Math.PI / 2;
    return { x: r * 0.4 * Math.cos(a), y: r * 0.4 * Math.sin(a) };
}



//////// COMPONENTS ////////

function Dot({ lid, ci, pos }) {
    return (
        <motion.div
            layoutId={lid}
            className="absolute rounded-full"
            style={{
                width: 10, height: 10,
                backgroundColor: SEED_COLORS[ci % SEED_COLORS.length],
                border: '1.5px solid #000',
                left: `calc(50% + ${pos.x}px - 5px)`,
                top: `calc(50% + ${pos.y}px - 5px)`,
            }}
            transition={{ type: 'spring', stiffness: 180, damping: 16 }}
        />
    );
}

function Hole({ seeds, sz = 40, glow, pfx }) {
    return (
        <div
            className={`relative rounded-full flex items-center justify-center ${glow === 'green' ? 'flicker-glow-green' :
                glow === 'red' ? 'flicker-glow-red' :
                    glow === 'yellow' ? 'flicker-glow' :
                        glow === 'gray' ? 'opacity-30' : ''
                }`}
            style={{
                width: sz, height: sz,
                backgroundColor: '#7A4C1C',
                border: '2px solid #000',
                flexShrink: 0,
            }}
        >
            {seeds.map((sid, i) => (
                <Dot key={sid} lid={`${pfx}-${sid}`} ci={sid} pos={off(i, seeds.length, sz / 2)} />
            ))}
        </div>
    );
}

function Anim({ id, layout, frames, pace = 800, rest = 2200 }) {
    const [f, setF] = useState(0);
    useEffect(() => {
        const d = f === frames.length - 1 ? rest : pace;
        const t = setTimeout(() => setF((f + 1) % frames.length), d);
        return () => clearTimeout(t);
    }, [f, frames.length, pace, rest]);
    const fr = frames[f];

    return (
        <LayoutGroup id={id}>
            <div className="flex flex-col items-center gap-1">
                <div className="h-8 flex items-center justify-center relative" style={{ width: 50 }}>
                    {(fr.hand || []).map((s, i) => (
                        <Dot key={s} lid={`${id}-${s}`} ci={s} pos={off(i, fr.hand.length, 16)} />
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    {layout.stL != null && (
                        <Hole seeds={fr.c[layout.stL] || []} sz={48} glow={fr.hl?.[layout.stL]} pfx={id} />
                    )}
                    <div className="flex flex-col gap-1.5">
                        {layout.rows.map((row, ri) => (
                            <div key={ri} className="flex gap-1.5">
                                {row.map(cupId => (
                                    <Hole key={cupId} seeds={fr.c[cupId] || []} glow={fr.hl?.[cupId]} pfx={id} />
                                ))}
                            </div>
                        ))}
                    </div>
                    {layout.stR != null && (
                        <Hole seeds={fr.c[layout.stR] || []} sz={48} glow={fr.hl?.[layout.stR]} pfx={id} />
                    )}
                </div>
                <p className="text-[11px] font-bold text-gray-500 text-center mt-1 min-h-[20px]">{fr.label}</p>
            </div>
        </LayoutGroup>
    );
}



//////// CONSTANTS ////////

const SOW_LAYOUT = { rows: [[0, 1, 2, 3]] };
const SOW_FRAMES = [
    { c: { 0: [0, 1, 2], 1: [], 2: [], 3: [] }, hand: [], label: 'Cup 1 has 3 seeds' },
    { c: { 0: [], 1: [], 2: [], 3: [] }, hand: [0, 1, 2], label: 'All seeds lifted' },
    { c: { 0: [], 1: [0], 2: [], 3: [] }, hand: [1, 2], label: 'Drop one in cup 2' },
    { c: { 0: [], 1: [0], 2: [1], 3: [] }, hand: [2], label: 'Drop one in cup 3' },
    { c: { 0: [], 1: [0], 2: [1], 3: [2] }, hand: [], label: 'All seeds distributed' },
];

const CONT_LAYOUT = { rows: [[0, 1, 2]] };
const CONT_FRAMES = [
    { c: { 0: [0], 1: [1, 2], 2: [] }, hand: [], label: 'Cup 1 has 1, cup 2 has 2' },
    { c: { 0: [], 1: [1, 2], 2: [] }, hand: [0], label: 'Pick up from cup 1' },
    { c: { 0: [], 1: [0, 1, 2], 2: [] }, hand: [], label: 'Lands on non-empty cup → continue!', hl: { 1: 'yellow' } },
    { c: { 0: [], 1: [], 2: [] }, hand: [0, 1, 2], label: 'Pick up all seeds from cup 2' },
    { c: { 0: [], 1: [], 2: [0] }, hand: [1, 2], label: 'Keep distributing...' },
    { c: { 0: [1], 1: [], 2: [0] }, hand: [2], label: 'Wraps back to cup 1' },
    { c: { 0: [1], 1: [2], 2: [0] }, hand: [], label: 'Turn complete' },
];

const FREE_LAYOUT = { rows: [['o1', 'o0'], ['p0', 'p1']], stR: 'st' };
const FREE_FRAMES = [
    {
        c: { 'p0': [0, 1], 'p1': [2], st: [] }, hand: [],
        label: 'Cup 1 has 2 seeds',
        hl: { o0: 'gray', o1: 'gray' }
    },
    {
        c: { 'p0': [], 'p1': [2], st: [] }, hand: [0, 1],
        label: 'Pick up',
        hl: { o0: 'gray', o1: 'gray' }
    },
    {
        c: { 'p0': [], 'p1': [0, 2], st: [] }, hand: [1],
        label: 'Keep distributing...',
        hl: { o0: 'gray', o1: 'gray' }
    },
    {
        c: { 'p0': [], 'p1': [0, 2], st: [1] }, hand: [],
        label: 'Lands in own store → free turn!',
        hl: { o0: 'gray', o1: 'gray', st: 'green' }
    },
];

const CAP_LAYOUT = { rows: [['o2', 'o1', 'o0'], ['p0', 'p1', 'p2']], stR: 'st' };
const CAP_FRAMES = [
    {
        c: { p0: [0], p1: [], p2: [], o0: [], o1: [1, 2, 3], o2: [], st: [] },
        hand: [],
        label: 'Own cup 1 has 1 seed; opposite has 3'
    },
    {
        c: { p0: [], p1: [], p2: [], o0: [], o1: [1, 2, 3], o2: [], st: [] },
        hand: [0],
        label: 'Pick up from own cup 1'
    },
    {
        c: { p0: [], p1: [0], p2: [], o0: [], o1: [1, 2, 3], o2: [], st: [] },
        hand: [],
        label: 'Lands on empty own cup!',
        hl: { p1: 'green', o1: 'red' }
    },
    {
        c: { p0: [], p1: [], p2: [], o0: [], o1: [], o2: [], st: [0, 1, 2, 3] },
        hand: [],
        label: 'Capture! All seeds → your store',
        hl: { st: 'green' }
    },
];

const GAME_OVER_LAYOUT = { rows: [['o0', 'o1', 'o2'], ['p0', 'p1', 'p2']], stL: 'sL', stR: 'sR' };
const GAME_OVER_FRAMES = [
    {
        c: { p0: [], p1: [], p2: [], o0: [0, 1], o1: [2, 3], o2: [4], sL: [5], sR: [6, 7, 8] }, hand: [],
        label: 'Your side is empty → it\'s game over!',
        hl: { p0: 'gray', p1: 'gray', p2: 'gray', sL: 'red', sR: 'green' }
    },
];



//////// COMPONENTS ////////

function NotationSection() {
    const [open, setOpen] = useState(false);

    return (
        <section>
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between py-1 group"
            >
                <h3 className="font-black text-gray-800 text-base">Dakon Notation</h3>
                <ChevronDown
                    size={18}
                    className="text-gray-500 transition-transform duration-300 group-hover:text-gray-800"
                    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        key="notation-body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div className="pt-3 space-y-6">

                            <div>
                                <h4 className="font-bold text-gray-800 mb-2">Symbols & Syntax</h4>
                                <p className="mb-3">
                                    Dakon notation is a compact text format for recording and sharing games.
                                    A game is a sequence of whitespace-separated <strong>tokens</strong>.
                                    Notations are <strong>case-sensitive</strong>. Import one to replay any
                                    game step-by-step.
                                </p>

                                <div className="border-2 border-black overflow-hidden mb-4">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-stone-100 border-b-2 border-black">
                                                <th className="px-3 py-2 text-left font-black text-gray-700 border-r-2 border-black w-20">
                                                    Symbol
                                                </th>
                                                <th className="px-3 py-2 text-left font-black text-gray-700">Meaning</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {[
                                                ['1–7', "Pick from P1's cup (bottom row, left → right)"],
                                                ['8–14', "Pick from P2's cup (top row, right → left)"],
                                                ['p', 'Last seed landed in own store → free pick follows immediately'],
                                                ['x', 'Capture taken (optional — omit to decline)'],
                                                ['#', 'Game-ending finisher (required on the final token)'],
                                                ['[...]', 'Comment — ignored by the engine'],
                                                ['space', 'Separates turns (P1 first, then P2, alternating)'],
                                            ].map(([sym, desc]) => (
                                                <tr key={sym}>
                                                    <td className="px-3 py-1.5 border-r-2 border-black font-mono font-bold text-gray-900">
                                                        {sym}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-gray-700">{desc}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="space-y-2.5 text-gray-700">
                                    <p>
                                        <strong>Cup numbers.</strong> The engine always tracks whose turn it is currently, so you only
                                        write the cup number, never the player's name. P1 uses <strong><code className={CODE_STYLE}>1</code></strong>-
                                        <strong><code className={CODE_STYLE}>7</code></strong>,
                                        P2 uses <strong><code className={CODE_STYLE}>8</code></strong>-
                                        <strong><code className={CODE_STYLE}>14</code></strong>.
                                    </p>
                                    <p>
                                        <strong>Free pick — </strong>Lowercase <strong><code className={CODE_STYLE}>p</code></strong>.
                                        Write <code className={CODE_STYLE}>p</code> right after the cup number and immediately continue with the
                                        next pick, without whitespaces. For example, <code className={CODE_STYLE}>5p7</code> means: pick cup 5 → lands
                                        in store → free pick → pick cup 7, all in one turn. Chain moves are allowed, e.g.{' '}
                                        <code className={CODE_STYLE}>3p5p7</code> = one turn, three moves consisting of two free picks.
                                    </p>
                                    <p>
                                        <strong>Capture — </strong>Lowercase <strong><code className={CODE_STYLE}>x</code></strong>. Adding{' '}
                                        <code className={CODE_STYLE}>x</code> means you chose to capture. Omitting it means you declined. Both are
                                        valid, but two recordings of the same game may differ on declined captures.
                                    </p>
                                    <p>
                                        <strong>Game over — <code className={CODE_STYLE}>#</code></strong>.
                                        Attach it directly to the last cup: <code className={CODE_STYLE}>6#</code>,
                                        never <code className={CODE_STYLE}>6 #</code>. A notation without<code className={CODE_STYLE}>#</code>, if
                                        valid, is treated as an incomplete game.
                                    </p>
                                    <p>
                                        <strong>Comments — <code className={CODE_STYLE}>[...]</code></strong>.
                                        Any text inside square brackets is ignored. Exported files include a score line like{' '}
                                        <code className={CODE_STYLE}>[ P1 | 54–19 | P2 ]</code> at the bottom. It is a comment and safely skipped
                                        upon import. You can add your own annotations the same way.
                                    </p>
                                </div>

                                <div className="mt-4 space-y-2">
                                    <div className="bg-amber-50 border-2 border-amber-400 px-3 py-2 text-xs">
                                        <span className="font-black">⚠ Common confusion: </span>
                                        <code className="font-mono bg-white px-1">5p 7</code> ≠{' '}
                                        <code className="font-mono bg-white px-1">5p7</code>. The space turns{' '}
                                        <code className="font-mono bg-white px-1">7</code> into P2&apos;s next move. Every pick in
                                        a free-pick chain must stay in the same word, without spaces.
                                    </div>
                                    <div className="bg-amber-50 border-2 border-amber-400 px-3 py-2 text-xs">
                                        <span className="font-black">⚠ Common confusion: </span>
                                        <code className="font-mono bg-white px-1">6 #</code> is invalid. The finisher must be
                                        attached: <code className="font-mono bg-white px-1">6#</code>.
                                    </div>
                                </div>
                            </div>

                            <hr className="border-black" />

                            <div>
                                <h4 className="font-bold text-gray-800 mb-2">Reading a Game</h4>
                                <p className="mb-3">
                                    Here is a short illustrative sequence that uses every notation symbol:
                                </p>

                                <div className="bg-gray-900 text-green-400 font-mono text-sm px-4 py-3 border-2 border-black mb-4 tracking-wide">
                                    4x &nbsp; 8 &nbsp; 3p6 &nbsp; 9p12x &nbsp; 7p# &nbsp; ...
                                </div>

                                <div className="space-y-2">
                                    {[
                                        {
                                            token: '4x',
                                            who: 'P1',
                                            desc: "P1 picks cup 4. Last seed lands on an empty own cup with seeds across → captures."
                                        },
                                        {
                                            token: '8',
                                            who: 'P2',
                                            desc: "P2 picks cup 8. P2's turn does not end in capture."
                                        },
                                        {
                                            token: '3p6',
                                            who: 'P1',
                                            desc: "P1 picks cup 3 → last seed lands in P1's store → free pick → picks cup 6. One turn."
                                        },
                                        {
                                            token: '9p12x',
                                            who: 'P2',
                                            desc: "P2 picks cup 9 → store → free pick → picks cup 12 → captures. One turn."
                                        },
                                        {
                                            token: '7p#',
                                            who: 'P1',
                                            desc: "P1 picks cup 7 → store → no free pick because P1's side is now empty → game over!"
                                        },
                                    ].map(({ token, who, desc }) => (
                                        <div key={token} className="flex gap-3 items-center text-xs">
                                            <code className="font-mono font-bold bg-stone-100 px-2 py-1 border border-black
                                                text-gray-900 shrink-0 min-w-[72px] text-center">
                                                {token}
                                            </code>
                                            <span
                                                className="font-bold shrink-0"
                                                style={{ color: who === 'P1' ? PLAYER_COLORS.p1[500] : PLAYER_COLORS.p2[500] }}
                                            >
                                                {who}
                                            </span>
                                            <span className="text-gray-700 leading-snug">{desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}



//////// MAIN CONTROL FLOW ////////

export default function HelpModal({ onClose }) {
    const scrollRef = useRef(null);
    const hideTimerRef = useRef(null);
    const [showBar, setShowBar] = useState(false);
    const [thumbTop, setThumbTop] = useState(0);
    const [thumbHeight, setThumbHeight] = useState(0);

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    const recalcThumb = () => {
        const el = scrollRef.current;
        if (!el) return;
        const { scrollTop, scrollHeight, clientHeight } = el;

        if (scrollHeight <= clientHeight) {
            setThumbHeight(0);
            return;
        }

        const h = Math.max((clientHeight / scrollHeight) * clientHeight, 32);
        const t = (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - h);
        setThumbTop(t);
        setThumbHeight(h);
    };

    const handleScroll = () => {
        recalcThumb();
        setShowBar(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setShowBar(false), 1000);
    };

    useEffect(() => {
        recalcThumb();
        return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
    }, []);

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
            <div className="bg-white border-3 border-black shadow-[6px_6px_0_#000] max-w-xl w-full max-h-[85vh] flex flex-col relative">

                <div className="bg-white border-b-2 border-black px-6 py-4 flex justify-between items-center flex-shrink-0 z-10">
                    <h2 className="text-lg font-black text-gray-800">Dakon — Help & Rules</h2>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center border-2 border-black hover:bg-stone-100">
                        <X size={16} />
                    </button>
                </div>

                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="overflow-y-auto flex-1"
                >
                    <div className="px-6 py-5 space-y-6 text-sm text-gray-700 leading-relaxed text-justify">
                        <section>
                            <h3 className="font-black text-gray-800 mb-2 text-base">About Dakon</h3>
                            <p>
                                <strong>Dakon</strong> is a traditional Javanese count-and-capture board game belonging to
                                the <strong>Mancala</strong> family, one of the oldest known game families in human history, with
                                archaeological evidence dating back over 3,000 years.
                            </p>
                            <p className="mt-2">
                                Across maritime Southeast Asia, the game is known by many names: <strong>Congkak</strong> in
                                Malaysia and Singapore, <strong>Congklak</strong> in Sundanese regions of Indonesia,
                                and <strong>Sungka</strong> in the Philippines. The game spread across the Indian Ocean and Pacific
                                Islands alongside ancient Austronesian seafarers, becoming one of the most widespread traditional games
                                in history.
                            </p>
                            <p className="mt-2">
                                Historically played on hand-carved wooden trays using cowrie shells, tamarind seeds, or small
                                pebbles, Dakon and its variants remain a beloved pastime across Southeast Asia, celebrated for
                                their blend of strategic depth and elegant simplicity. The name <em>Dakon</em> itself comes from
                                the Javanese word for the game, while <em>Congkak</em> and <em>Congklak</em> are believed to be
                                onomatopoeic, mimicking the sound of shells clinking together.
                            </p>
                        </section>

                        <hr className="border-black" />

                        <section>
                            <h3 className="font-black text-gray-800 mb-3 text-base">How to Play</h3>

                            <div className="mb-6">
                                <h4 className="font-bold text-gray-800 mb-1">Board Layout</h4>
                                <p>
                                    The board has <strong>2 rows of 7 cups</strong> and <strong>2 large stores</strong> on either end.
                                    Player 1 (P1) owns the bottom row and the right store; Player 2 (P2) owns the top row and the
                                    left store. Each cup starts with <strong>7 seeds</strong> (98 total).
                                </p>
                            </div>

                            <div className="mb-6">
                                <h4 className="font-bold text-gray-800 mb-1">Sowing</h4>
                                <p className="mb-2">
                                    Pick up all seeds from one of your cups and distribute them counter-clockwise, one per cup.
                                    Your own store is included, but your opponent's store is <em>always</em> skipped.
                                </p>
                                <div className="bg-stone-50 border-2 border-black rounded-xl p-3">
                                    <Anim id="sow" layout={SOW_LAYOUT} frames={SOW_FRAMES} />
                                </div>
                            </div>

                            <div className="mb-6">
                                <h4 className="font-bold text-gray-800 mb-1">Continuing</h4>
                                <p className="mb-2">
                                    If the last seed lands on a <strong>non-empty</strong> cup, pick up all seeds from that cup and keep sowing.
                                    This creates chain reactions that can circle the board multiple times.
                                </p>
                                <div className="bg-stone-50 border-2 border-black rounded-xl p-3">
                                    <Anim id="cont" layout={CONT_LAYOUT} frames={CONT_FRAMES} />
                                </div>
                            </div>

                            <div className="mb-6">
                                <h4 className="font-bold text-gray-800 mb-1">Free Turn</h4>
                                <p className="mb-2">
                                    If the last seed lands in your <strong>own store</strong>, you earn a free turn. Pick any of
                                    your <strong>non-empty</strong> cups to sow next.
                                </p>
                                <div className="bg-stone-50 border-2 border-black rounded-xl p-3">
                                    <Anim id="free" layout={FREE_LAYOUT} frames={FREE_FRAMES} />
                                </div>
                            </div>

                            <div className="mb-6">
                                <h4 className="font-bold text-gray-800 mb-1">Capture</h4>
                                <p className="mb-2">
                                    If the last seed lands on an <strong>empty cup on your side</strong>, and the directly opposite
                                    cup on the opponent's row contains seeds, you may <strong>capture</strong>: your seed and all
                                    opponent seeds from the mirror cup are moved into your store. You may also decline.
                                </p>
                                <div className="bg-stone-50 border-2 border-black rounded-xl p-3">
                                    <Anim id="cap" layout={CAP_LAYOUT} frames={CAP_FRAMES} />
                                </div>
                            </div>

                            <div className="mb-6">
                                <h4 className="font-bold text-gray-800 mb-1">Game Over</h4>
                                <p className="mb-2">
                                    The game ends when <strong>either player</strong> has <strong>no seeds left</strong> on any of their cups.
                                    The player with more seeds in their store wins. If both have the same amount of seeds in their
                                    store, it's a draw!
                                </p>
                                <div className="bg-stone-50 border-2 border-black rounded-xl p-3">
                                    <Anim id="gameOver" layout={GAME_OVER_LAYOUT} frames={GAME_OVER_FRAMES} pace={3000} rest={3000} />
                                </div>
                            </div>
                        </section>

                        <hr className="border-black" />

                        <NotationSection />
                    </div>
                </div>

                <div className="absolute right-0 top-0 bottom-0 w-2 pointer-events-none z-20 overflow-hidden">
                    <div
                        className="absolute right-[3px] rounded-full bg-stone-400 transition-opacity duration-500"
                        style={{
                            top: thumbTop,
                            height: thumbHeight,
                            opacity: showBar && thumbHeight > 0 ? 0.75 : 0,
                        }}
                    />
                </div>

            </div>
        </div>
    );
}