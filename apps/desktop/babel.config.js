const { env } = require("node:process");

// You may need to pass the `--clear` flag in some cases. e.g.:
// `node --run start -- --port 8082 --clear`
module.exports = function (api) {
  api.cache(true);

  const __VITE_PORT = env.VITE_PORT ?? 5173;
  console.log(
    `Babel config resolved vite port of ${__VITE_PORT} (given env.VITE_PORT ${env.VITE_PORT})`,
  );

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "transform-define",
        {
          __VITE_PORT,
        },
      ],
    ],
  };
};
