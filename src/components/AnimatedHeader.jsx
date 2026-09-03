//////// IMPORTS ////////

import { useEffect, useState, useRef } from 'react';


//////// CONSTANTS ////////

const POOL = "!\"#$%&'()*+,-./0123456789:;<=>?@[\\]^_`{|}~¢£¥§©®°×÷π•€™∆√✓";

const LAT_TEXT = 'Dakonplete';

const JAV_TEXT = 'ꦢꦏꦺꦴꦤ꧀ꦥ꧀ꦭꦶꦠ꧀';

const LAT_SIZE = '2.8rem';

const JAV_SIZE = '3.5rem';

const JAV_GRAPHEMES = Array.from(JAV_TEXT);

const LAT_GRAPHEMES = LAT_TEXT.split('');



//////// UTILITIES ////////

function getRandomChars(length) {
    const chars = [];
    const available = POOL.split('');

    for (let i = 0; i < length; i++) {

        if (available.length === 0) break;

        const randIdx = Math.floor(Math.random() * available.length);
        chars.push({
            char: available[randIdx],
            color: `hsl(${Math.floor(Math.random() * 360)}, 100%, 30%)`
        });
        available.splice(randIdx, 1);
    }

    return chars;
}


function getHighlights(originalCount, randomCount) {
    const hues = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

    for (let i = hues.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [hues[i], hues[j]] = [hues[j], hues[i]];
    }

    const result = [];
    let hueIdx = 0;
    const originalProb = originalCount > 0 ? 0.2 / originalCount : 0;

    for (let i = 0; i < originalCount; i++) {
        result.push(
            Math.random() < originalProb
                ? `hsla(${hues[hueIdx++]}, 100%, 70%, 0.3)`
                : 'transparent'
        );
    }

    for (let i = 0; i < randomCount; i++) {
        result.push(
            Math.random() < 0.4
                ? `hsla(${hues[hueIdx++]}, 100%, 70%, 0.3)`
                : 'transparent'
        );
    }

    return result;
}



//////// COMPONENTS ////////

export default function AnimatedHeader() {
    const [phase, setPhase] = useState('IDLE_LAT');
    const [progressIdx, setProgressIdx] = useState(0);
    const [randomSuffix, setRandomSuffix] = useState([]);
    const [highlights, setHighlights] = useState([]);

    const phaseRef = useRef(phase);
    const progressRef = useRef(progressIdx);
    const lastTick = useRef(0);
    const shuffleTick = useRef(0);

    useEffect(() => {
        phaseRef.current = phase;
        progressRef.current = progressIdx;
    }, [phase, progressIdx]);

    useEffect(() => {
        lastTick.current = Date.now();
        shuffleTick.current = Date.now();

        let animationFrameId;

        const loop = () => {
            const now = Date.now();
            const p = phaseRef.current;
            const idx = progressRef.current;

            if (p === 'IDLE_LAT' || p === 'IDLE_JAV') {

                if (now - lastTick.current >= 5000) {
                    const newPhase = p === 'IDLE_LAT' ? 'WIPE_LAT' : 'WIPE_JAV';
                    setPhase(newPhase);
                    setProgressIdx(0);
                    setRandomSuffix([]);
                    setHighlights([]);
                    lastTick.current = now;
                    shuffleTick.current = now;
                }
            }

            else {
                const targetGraphemes = p.includes('LAT') ? LAT_GRAPHEMES : JAV_GRAPHEMES;
                const totalLen = targetGraphemes.length;

                if (now - shuffleTick.current >= 40) {
                    const numRandomChars = p.includes('WIPE')
                        ? idx
                        : (totalLen - idx);
                    const numOriginalChars = totalLen - numRandomChars;

                    if (numRandomChars > 0) {
                        setRandomSuffix(getRandomChars(numRandomChars));
                    }

                    else {
                        setRandomSuffix([]);
                    }

                    setHighlights(getHighlights(numOriginalChars, numRandomChars));
                    shuffleTick.current = now;
                }

                if (now - lastTick.current >= 100) {

                    if (idx + 1 > totalLen) {

                        if (p === 'WIPE_LAT') {
                            setPhase('REVEAL_JAV');
                            setProgressIdx(0);
                            setRandomSuffix(getRandomChars(JAV_GRAPHEMES.length));
                        }

                        else if (p === 'REVEAL_JAV') {
                            setPhase('IDLE_JAV');
                            setProgressIdx(0);
                            setRandomSuffix([]);
                            setHighlights([]);
                        }

                        else if (p === 'WIPE_JAV') {
                            setPhase('REVEAL_LAT');
                            setProgressIdx(0);
                            setRandomSuffix(getRandomChars(LAT_GRAPHEMES.length));
                            setHighlights(getHighlights(0, LAT_GRAPHEMES.length));
                        }

                        else if (p === 'REVEAL_LAT') {
                            setPhase('IDLE_LAT');
                            setProgressIdx(0);
                            setRandomSuffix([]);
                            setHighlights([]);
                        }
                    }

                    else {
                        setProgressIdx(idx + 1);
                        const newIdx = idx + 1;
                        const numRandomChars = p.includes('WIPE')
                            ? newIdx
                            : (totalLen - newIdx);

                        if (numRandomChars > 0) {
                            setRandomSuffix(getRandomChars(numRandomChars));
                        }

                        else {
                            setRandomSuffix([]);
                        }
                    }

                    lastTick.current = now;
                    shuffleTick.current = now;
                }
            }

            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    const renderText = () => {
        const javStyle = { fontWeight: 'normal' };
        const latStyle = { fontWeight: 'bold' };
        const randStyle = { fontWeight: 1000 };

        if (phase === 'IDLE_LAT') {
            return LAT_GRAPHEMES.map((c, i) => (
                <span
                    key={i}
                    style={{
                        ...latStyle,
                        fontSize: LAT_SIZE,
                        fontFamily: "'Century Schoolbook', Georgia, serif"
                    }}
                >
                    {c}
                </span>
            ));
        }

        if (phase === 'IDLE_JAV') {
            return JAV_GRAPHEMES.map((c, i) => (
                <span
                    key={i}
                    style={{
                        ...javStyle,
                        fontSize: JAV_SIZE,
                        fontFamily: "'Nawatura', sans-serif"
                    }}
                >
                    {c}
                </span>
            ));
        }

        if (phase === 'WIPE_LAT') {
            const latPart = LAT_GRAPHEMES.slice(0, LAT_GRAPHEMES.length - progressIdx);
            return (
                <>
                    {latPart.map((c, i) => (
                        <span
                            key={`e-${i}`}
                            style={{
                                ...latStyle,
                                fontSize: LAT_SIZE,
                                fontFamily: "'Century Schoolbook', Georgia, serif",
                                backgroundColor: highlights[i] || 'transparent'
                            }}
                        >
                            {c}
                        </span>
                    ))}
                    {randomSuffix.map((r, i) => (
                        <span
                            key={`r-${i}`}
                            style={{
                                ...randStyle,
                                fontSize: LAT_SIZE,
                                fontFamily: "'Cascadia Mono', monospace",
                                color: r.color,
                                backgroundColor: highlights[latPart.length + i] || 'transparent'
                            }}
                        >
                            {r.char}
                        </span>
                    ))}
                </>
            );
        }

        if (phase === 'REVEAL_JAV') {
            const javPart = JAV_GRAPHEMES.slice(0, progressIdx);
            return (
                <>
                    {javPart.map((c, i) => (
                        <span
                            key={`j-${i}`}
                            style={{
                                ...javStyle,
                                fontSize: JAV_SIZE,
                                fontFamily: "'Nawatura', sans-serif",
                                backgroundColor: highlights[i] || 'transparent'
                            }}
                        >
                            {c}
                        </span>
                    ))}
                    {randomSuffix.map((r, i) => (
                        <span
                            key={`r-${i}`}
                            style={{
                                ...randStyle,
                                fontSize: LAT_SIZE,
                                fontFamily: "'Cascadia Mono', monospace",
                                color: r.color,
                                backgroundColor: highlights[javPart.length + i] || 'transparent'
                            }}
                        >
                            {r.char}
                        </span>
                    ))}
                </>
            );
        }

        if (phase === 'WIPE_JAV') {
            const javPart = JAV_GRAPHEMES.slice(0, JAV_GRAPHEMES.length - progressIdx);
            return (
                <>
                    {javPart.map((c, i) => (
                        <span
                            key={`j-${i}`}
                            style={{
                                ...javStyle,
                                fontSize: JAV_SIZE,
                                fontFamily: "'Nawatura', sans-serif",
                                backgroundColor: highlights[i] || 'transparent'
                            }}
                        >
                            {c}
                        </span>
                    ))}
                    {randomSuffix.map((r, i) => (
                        <span
                            key={`r-${i}`}
                            style={{
                                ...randStyle,
                                fontSize: LAT_SIZE,
                                fontFamily: "'Cascadia Mono', monospace",
                                color: r.color,
                                backgroundColor: highlights[javPart.length + i] || 'transparent'
                            }}
                        >
                            {r.char}
                        </span>
                    ))}
                </>
            );
        }

        if (phase === 'REVEAL_LAT') {
            const engPart = LAT_GRAPHEMES.slice(0, progressIdx);
            return (
                <>
                    {engPart.map((c, i) => (
                        <span
                            key={`e-${i}`}
                            style={{
                                ...latStyle,
                                fontSize: LAT_SIZE,
                                fontFamily: "'Century Schoolbook', Georgia, serif",
                                backgroundColor: highlights[i] || 'transparent'
                            }}
                        >
                            {c}
                        </span>
                    ))}
                    {randomSuffix.map((r, i) => (
                        <span
                            key={`r-${i}`}
                            style={{
                                ...randStyle,
                                fontSize: LAT_SIZE,
                                fontFamily: "'Cascadia Mono', monospace",
                                color: r.color,
                                backgroundColor: highlights[engPart.length + i] || 'transparent'
                            }}
                        >
                            {r.char}
                        </span>
                    ))}
                </>
            );
        }

        return null;
    };

    return (
        <h1 className="text-black leading-tight pt-7">
            {renderText()}
        </h1>
    );
}
