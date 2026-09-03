//////// IMPORTS ////////

import { chooseMove } from './search.js';


//////// MAIN CONTROL FLOW ////////

self.onmessage = (event) => {
    const { type, requestId, board, turn, options } = event.data;

    if (type !== 'SOLVE') return;

    try {
        const result = chooseMove(Int32Array.from(board), turn, options ?? {});

        self.postMessage({ type: 'RESULT', requestId, result });
    }

    catch (error) {
        self.postMessage({ type: 'ERROR', requestId, message: error.message });
    }
};