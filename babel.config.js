module.exports = function (api) {
  api.cache(true);
  const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.JEST_WORKER_ID);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
    // Reanimated's Babel plugin requires react-native-worklets on some stacks; Jest
    // does not need the transform — skip it in test to avoid the worklets resolution error.
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            "@/app": "./app",
            "@/features": "./src/features",
            "@/shared": "./src/shared",
            "@/modules": "./modules",
          },
        },
      ],
      ...(isTest ? [] : ["react-native-reanimated/plugin"]),
    ],
  };
};
