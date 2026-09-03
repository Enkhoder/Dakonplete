//////// CONSTANTS ////////

const SESSION = Math.random() * 99999;



//////// UTILITIES ////////

function hash(a, b) {
    let x = Math.sin(a * 12.9898 + b * 78.2331 + SESSION) * 43758.5453;
    return x - Math.floor(x);
}


export function getSeedOffsetsForCup(seedIds, cupIndex, cupRadius) {
    const offsets = [];
    const MIN_DIST = 8.3;

    for (let i = 0; i < seedIds.length; i++) {
        const seedId = seedIds[i];
        let candidate = { x: 0, y: 0 };
        let attempts = 0;

        while (attempts < 50) {
            const r = hash(seedId * 7 + cupIndex * 31 + attempts, 1) * cupRadius * 0.8;
            const theta = hash(seedId * 13 + cupIndex * 17 + attempts, 2) * Math.PI * 2;
            candidate = { x: r * Math.cos(theta), y: r * Math.sin(theta) };

            let ok = true;

            for (let j = 0; j < i; j++) {
                const dx = candidate.x - offsets[j].x;
                const dy = candidate.y - offsets[j].y;

                if (dx * dx + dy * dy < MIN_DIST * MIN_DIST) {
                    ok = false;
                    break;
                }
            }

            if (ok) break;
            attempts++;
        }

        offsets.push(candidate);
    }

    return offsets;
}