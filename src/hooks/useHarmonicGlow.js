//////// IMPORTS ////////

import { useLayoutEffect } from 'react';


//////// CONSTANTS ////////

const PERIOD_MS = 1000;

const STAGGER_MS = 150;

const GLOW_KEYFRAMES = [
    { boxShadow: '0 0 0 3px transparent' },
    { boxShadow: '0 0 0 4px #FBBF24' },
    { boxShadow: '0 0 0 3px transparent' },
];


//////// HOOKS ////////

export default function useHarmonicGlow(ref, active, order) {

    useLayoutEffect(() => {
        const node = ref.current;

        if (!node || !active) return;

        const animation = node.animate(GLOW_KEYFRAMES, {
            duration: PERIOD_MS,
            iterations: Infinity,
            delay: order * STAGGER_MS,
        });
        animation.startTime = 0;
        return () => animation.cancel();
    }, [ref, active, order]);
}
