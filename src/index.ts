const cluster = require('cluster');
const os = require('os');
const { startServer } = require('./app.ts');
import config from './config/index';
import chalk from 'chalk';

if (config.environment == 'PROD') {
  // Check if current process is master.
  if (cluster.isMaster) {
    console.log('MASTER');
    // Get total CPU cores.
    const cpuCount = os.cpus().length;

    // Spawn a worker for every core.
    for (let j = 0; j < cpuCount; j++) {
      let refCount = cpuCount - 1;
      console.log('Spawning new worker server... ' + j + ' of ' + refCount);
      if (refCount === j) {
        console.log('Please wait. Initializing server instances.......');
      }
      cluster.fork();
    }
  } else {
    startServer();
  }

  // Cluster API has a variety of events.
  // Here we are creating a new process if a worker die.
  cluster.on('exit', function (worker) {
    console.log(`Worker ${worker.id} died'`);
    console.log(`Staring a new one...`);
    cluster.fork();
  });
} else {
  console.log('\n');
  console.log(chalk.yellow('WARNING: Not creating multiple instances. Because we are in development mode.'));
  console.log('\n');
  startServer();
}
