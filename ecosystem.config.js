module.exports = {
  apps: [
    {
      name: 'walless-backend',
      script: './dist/index.js',
      watch: true,
      ignore_watch: ['schema.json'],
      instance_var: 'INSTANCE_ID',
      env: {
        'PORT': 8080,
        'NODE_ENV': 'production'
      }
    }
  ]
};
