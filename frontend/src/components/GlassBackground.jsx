import { motion } from "framer-motion"

function GlassBackground() {

  return (

    <div className="fixed inset-0 -z-10 overflow-hidden">

      {/* Yellow blob */}
      <motion.div
        className="absolute w-[500px] h-[500px] bg-yellow-400/20 rounded-full blur-[120px]"
        animate={{
          x: [0, 200, -200, 0],
          y: [0, 150, -150, 0]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Purple blob */}
      <motion.div
        className="absolute w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[120px]"
        animate={{
          x: [200, -200, 200],
          y: [-100, 150, -100]
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      {/* Blue blob */}
      <motion.div
        className="absolute w-[450px] h-[450px] bg-blue-500/20 rounded-full blur-[120px]"
        animate={{
          x: [-200, 200, -200],
          y: [100, -150, 100]
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear"
        }}
      />

    </div>

  )

}

export default GlassBackground