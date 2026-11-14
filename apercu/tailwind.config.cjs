const base = require("../tailwind.config.ts").default;
module.exports = { ...base, content: [__dirname + "/demo.tsx", __dirname + "/../src/components/ExerciseAnimation.tsx"] };
