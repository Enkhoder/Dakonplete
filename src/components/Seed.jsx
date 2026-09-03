//////// IMPORTS ////////

// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';



//////// COMPONENTS ////////

export default function Seed({ seed, offset = { x: 0, y: 0 } }) {
    return (
        <motion.div
            layoutId={`s${seed.id}`}
            transition={{ type: 'spring', stiffness: 170, damping: 20 }}
            className="absolute rounded-full pointer-events-none"
            style={{
                width: 18,
                height: 18,
                backgroundColor: seed.color,
                border: '2px solid #000',
                left: `calc(50% + ${offset.x}px - 9px)`,
                top: `calc(50% + ${offset.y}px - 9px)`,
            }}
        />
    );
}
