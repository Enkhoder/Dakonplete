//////// IMPORTS ////////

import { getSeedOffsetsForCup } from '../utils/seedPhysics';
import { useGameStore } from '../store/gameStore';
import { LayoutGroup } from 'framer-motion';
import Seed from './Seed';
import Cup from './Cup';



//////// COMPONENTS ////////

export default function GameBoard() {
    const previewIndex = useGameStore(s => s.previewIndex);
    const undoStack = useGameStore(s => s.undoStack);
    const liveSeeds = useGameStore(s => s.seeds);

    const seeds = previewIndex !== null && undoStack[previewIndex + 1]
        ? undoStack[previewIndex + 1].seeds
        : liveSeeds;
    const handSeeds = seeds.filter(s => s.cup === -1);
    const offsets = getSeedOffsetsForCup(handSeeds.map(s => s.id), -1, 25);

    return (
        <LayoutGroup>
            <div className="relative w-full flex justify-center max-w-[860px] mx-auto">
                {handSeeds.length > 0 && (
                    <div
                        className="absolute -top-14 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center"
                        style={{ width: 50, height: 50 }}
                    >
                        {handSeeds.map((seed, i) => (
                            <Seed
                                key={seed.id}
                                seed={seed}
                                offset={offsets[i]}
                            />
                        ))}
                    </div>
                )}

                <div className="absolute inset-0 rounded-full bg-black translate-x-[7px] translate-y-[7px] z-0" />

                <div
                    className="flex items-center gap-3 px-5 py-6 rounded-full relative z-10 w-full"
                    style={{
                        backgroundColor: '#A87A56',
                        border: '4px solid #000',
                    }}
                >
                    <Cup index={16} isStore />

                    <div className="flex flex-col gap-3 flex-1 relative z-10">
                        <div className="flex justify-between">
                            {[14, 13, 12, 11, 10, 9, 8].map(i => (
                                <Cup key={i} index={i} />
                            ))}
                        </div>
                        <div className="flex justify-between">
                            {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                <Cup key={i} index={i} />
                            ))}
                        </div>
                    </div>

                    <Cup index={15} isStore />
                </div>
            </div>
        </LayoutGroup>
    );
}