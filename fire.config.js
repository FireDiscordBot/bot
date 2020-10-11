module.exports = {
  apps: [
    {
      name: "fire",
      script: "dist/src/index.js",
      args: "start",
      exec_mode: "cluster",
      instances: 1,
      automation: false,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "firedev",
      script: "npm",
      args: "run dev",
      automation: false,
    },
  ],
};
