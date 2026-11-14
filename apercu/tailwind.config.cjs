const base = require("../tailwind.config.ts").default;
module.exports = { ...base, content: [__dirname + "/demo.tsx", __dirname + "/../src/components/ExerciseAnimation.tsx", __dirname + "/../src/components/ExerciseVideo.tsx", __dirname + "/../src/components/Materiel.tsx"] };
