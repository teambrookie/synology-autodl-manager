let CronJob = require('cron').CronJob;
let feral = require('./clients/feral-client');


let cronConfig = process.env.CRON_CONFIG || '0 */3 * * * *';
let remoteUser = process.env.REMOTE_USER || 'default_user';
let remotePassword = process.env.REMOTE_PASSWORD || 'no_password';
let destPassword = process.env.DS_PASSWORD || 'no_password';
let destUser = process.env.DS_USER || 'default_user';
let rootUrlServer = process.env.ROOT_PATH_REMOTE_SERVER || 'http://bloodmaker.anax.feralhosting.com/links/';
let synoUrl = process.env.DS_URL || 'http://192.168.1.200:5555';
let remoteUrl = process.env.REMOTE_URL || 'http://anax.feralhosting.com:8088';



let destFolder = process.env.DS_DEST_FOLDER || undefined;




// ######## CRON JOB ############
new CronJob(cronConfig, function() {
  feral.loginToRemoteServer(remoteUser,remotePassword)
}, null, true);
