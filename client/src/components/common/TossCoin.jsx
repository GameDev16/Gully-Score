import { motion } from "framer-motion";

export default function TossCoin({ result, teamA, teamB }) {
  // result: 'A' or 'B' (which team won the toss)
  const flipTo = result === "A" ? 0 : 180;
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <motion.div
        initial={{ rotateY: 0 }}
        animate={{ rotateY: 1080 + flipTo }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-xl flex items-center justify-center text-2xl font-bold text-amber-900"
        style={{ transformStyle: "preserve-3d" }}
      >
        🏏
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="text-center"
      >
        <div className="text-xs text-slate-500 uppercase tracking-wide">
          Toss Won
        </div>
        <div className="font-display text-2xl font-bold">
          {result === "A" ? teamA?.name : teamB?.name}
        </div>
      </motion.div>
    </div>
  );
}
