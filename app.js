let loopTime = process.env.LOOP_TIME || 10000;
let remoteUser = process.env.REMOTE_USER || 'default_user';
let remotePassword = process.env.REMOTE_PASSWORD || 'no_password';
let destPassword = process.env.DS_PASSWORD || 'no_password';
let destUser = process.env.DS_USER || 'default_user';
let rootUrlServer = process.env.ROOT_PATH_REMOTE_SERVER || 'http://bloodmaker.anax.feralhosting.com/links/';
let synoUrl = process.env.DS_URL || 'http://192.168.1.200:5555';
let remoteUrl = 'http://anax.feralhosting.com:8088';
let remoteToken;
var request = require('superagent');
let CronJob = require('cron').CronJob;

let destFolder = process.env.DS_DEST_FOLDER;

let loginToRemoteServer = (user,pass) => {
  console.log('Login to source server');
  console.log('logging to',remoteUrl + '/auth');
  request
  .post(remoteUrl + '/auth')
  .set('Content-Type', 'application/x-www-form-urlencoded')
  .send({ username: user, password: pass })
  .end(function(err, res){
    if (err) {
      console.log('Login failed');
      console.log(res);
      remoteToken = null;
    }
    else {
      remoteToken = JSON.parse(res.text);
      console.log('>>Login success to source server');
      loginToDestServer(destUser,destPassword);
    }
  });
};

let loginToDestServer = (user,password) => {
  console.log('Login to destination server');
  request
  .get(synoUrl + '/webapi/auth.cgi')
  .query({
    api: 'SYNO.API.Auth',
    version: '2',
    method: 'login',
    account: user,
    passwd: password,
    session: 'DownloadStation',
    format: 'sid'
  }) // query string
  .end(function(err, res){
    if (err) {
      console.log('Error trying to connect to destination server (timeout)')
    }
    else{
      let jsonResponse = JSON.parse(res.text);
      if (jsonResponse.error) {
        console.log(jsonResponse.error.code);
      }
      else {
        console.log('>>Login success to destination server');
        sid = jsonResponse.data.sid;
        GetDownloadTaskList(sid);
      }
    }
  })
};

let GetDownloadTaskList = (sid) => {
  console.log('Listing current task in DownloadStation');
  request
   .get(synoUrl + '/webapi/DownloadStation/task.cgi')
   .query({
     api:'SYNO.DownloadStation.Task',
     version: '1',
     method: 'list',
     additional:'file',
     _sid:sid
   })
   .end(function(err,res){
     if (err) {
       console.log('Error trying to connect to destination server (timeout)')
     }
     else{
       let jsonResponse = JSON.parse(res.text);
       if (jsonResponse.error) {
         console.log(jsonResponse.error.code);
       }
       else {
         console.log('>>Listing tasks ok');
         GetRemoteFileList(jsonResponse.data.tasks, sid);
       }
     }
   });
};

let CompareRemoteToLocal = (tasks,listFiles,sid) => {
  console.log('Compare sources files to current tasks');
  let fileToAddToDownloadList = [];
  let fileToRemoveFromServer = [];
  for (let i = 0; i < listFiles.length; i++) {
    let remoteItem = listFiles[i];
    let alreadyExists = false;
    let finished = false;
    for (let j = 0; j < tasks.length; j++) {

      if (remoteItem.name == tasks[j].title) {
        console.log(remoteItem.name, tasks[j].title);
        alreadyExists = true;
        if (tasks[j].status == 'finished') {
          fileToRemoveFromServer.push(remoteItem);
        }
      }
    }
    if (!alreadyExists) {
      fileToAddToDownloadList.push(remoteItem);
    }
  }
  CleanUpDownloadTasks(fileToAddToDownloadList,sid);
  RemoveFilesFromServer(fileToRemoveFromServer);
}

let GetRemoteFileList = (tasks,sid) => {
  console.log('Getting file list from source server with token '+remoteToken);
  request
   .get(remoteUrl + '/files')
   .set('Accept','application/json')
   .set('Authorization', 'Bearer '+remoteToken)
   .end(function(err,res){
     if (err) {
       console.log('FAILED');
       console.log(err);
     }
     else{
       console.log('Getting list of files SUCCESS');
       CompareRemoteToLocal(tasks,res.body,sid);
     }
   });
};

let AddFileToDownloadList = (list,sid) => {
  console.log('Starting to add files to Download Task List');
  var destFolderArg = destFolder ? '&destination='+destFolder : '';
  // Due to Synology API limitation, I choose to limit the list to 20 items.
  list = list.splice(0,Math.min(20,list.length));
  for (let i = 0; i < list.length; i++) {

    let endPath = list[i].path;
    let firstSlashIndex = endPath.indexOf('/');
    let url_file = rootUrlServer+list[i].path.substring(firstSlashIndex+1)+list[i].name;
    //url_file = url_file.replace(/\/\//,'/');
    url_file = url_file.replace(/ /g,'%20');
    url_file = url_file.replace(/,/g,'%2C');
    console.log('Adding file',list[i].name);
    //console.log('adding file with url',url_file);
    request
     .get(synoUrl + '/webapi/DownloadStation/task.cgi')
     .query({
       api:'SYNO.DownloadStation.Task',
       version: '1',
       method: 'create',
       uri: url_file,
       _sid: sid
     })
     .end(function(err,res){
       if (err) {
         console.log('FAILED to add',list[i].name);
         console.log(err);
       }
       else{
         if (JSON.parse(res.text).error) {
           console.log('FAILED to add',list[i].name);
           console.log('error',JSON.parse(res.text).error);
         }
         else{
           console.log('File added with SUCCESS:',list[i].name);
         }

       }
     });
  }
}
let RemoveFilesFromServer = (files) => {
  request
    .delete(remoteUrl + '/files')
    .send(files)
    .set('Authorization', 'Bearer '+remoteToken)
    .set('Content-Type','application/json')
    .end(function(err,res){
      if(err){
        console.log("Failed to delete on remote server");
      }
      else{
        console.log(files.length,'files have been deleted');
      }
    });
};

let CleanUpDownloadTasks = (list,sid) => {
  console.log('Cleaning up tasks on DS...');
  request
    .get(synoUrl + '/webapi/DownloadStation/task.cgi')
    .query({
      api:'SYNO.DownloadStation.Task',
      version:'1',
      method:'list',
      additional:'file',
      _sid:sid
    })
    .end(function(err,res){
      if (err) {
        console.error("Error while calling Synology API");
      }
      else {
        if(JSON.parse(res.text).error){

        }
        else{
          var tasks = JSON.parse(res.text).data.tasks;
          for (var i = 0; i < tasks.length; i++) {
            if (tasks[i].status == 'finished') {
              let title = tasks[i].title;
              console.log('Removing '+title+' from download tasks');
              request
                .get(synoUrl + '/webapi/DownloadStation/task.cgi')
                .query({
                  api:'SYNO.DownloadStation.Task',
                  version:'1',
                  method:'delete',
                  id:tasks[i].id,
                  _sid:sid
                })
                .end(function(err,res){
                  if (err) {
                      console.error("Error while calling Synology API");
                  }
                  else {
                    if(JSON.parse(res.text).error){
                        console.error("Error while calling Synology API",JSON.parse(res.text).error);
                    }
                    else{
                      console.log('File',title +' deleted');
                    }
                  }
                });
            }
          }
        }
      }
    });
    AddFileToDownloadList(list,sid);
};

new CronJob('* */10 * * * *', function() {
  loginToRemoteServer(remoteUser,remotePassword)
}, null, true);
