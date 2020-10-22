module.exports = {
  apps: [
    {
      name: "fire",
      script: "dist/src/index.js",
      args: "start",
      exec_mode: "cluster",
      instances: 2,
      automation: false,
      env: {
        NODE_ENV: "production",
      },
      wait_ready: true,
    },
    {
      name: "firedev",
      script: "npm",
      args: "run dev",
      automation: false,
    },
    {
      name: "firedev-clustered",
      script: "npm",
      args: "run devpm2",
      instances: 1,
      automation: false,
      wait_ready: true,
    },
  ],
};
