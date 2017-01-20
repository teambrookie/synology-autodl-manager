let Client = require('node-rest-client').Client;
let client = new Client();
let loopTime = process.env.LOOP_TIME;
let remoteUser = process.env.REMOTE_USER;
let remotePassword = process.env.REMOTE_PASSWORD;
let destPassword = process.env.DS_PASSWORD;
let destUser = process.env.DS_USER;
let rootUrlServer = process.env.ROOT_PATH_REMOTE_SERVER || 'http://bloodmaker.anax.feralhosting.com/links/';
let synoUrl = process.env.DS_URL || 'http://192.168.1.200:5555'; //'http://bloodmaker.ddns.net';
let remoteUrl = 'http://anax.feralhosting.com:8088';
var sleep = require('sleep');

let remoteToken;
var request = require('superagent');

let destFolder = process.env.DS_DEST_FOLDER;

let loginToRemoteServer = (user,pass) => {
  console.log('Login to source server');
  request
  .post(remoteUrl + '/auth')
  .set('Content-Type', 'application/x-www-form-urlencoded')
  .send({ username: user, password: pass })
  .end(function(err, res){
    // Do something
    if (err) {
      console.log('Login failed');
      console.log(res.text);
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
    for (let j = 0; j < tasks.length; j++) {
      if (remoteItem.name == tasks[j].title) {
        alreadyExists = true;
        fileToRemoveFromServer.push(remoteItem);
      }
    }
    if (!alreadyExists) {
      fileToAddToDownloadList.push(remoteItem);
    }
  }
  AddFileToDownloadList(fileToAddToDownloadList,sid);
  //RemoveFilesFromServer(fileToRemoveFromServer);
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
  for (let i = 0; i < list.length; i++) {

    let endPath = list[i].path;
    let firstSlashIndex = endPath.indexOf('/');
    let url_file = rootUrlServer+list[i].path.substring(firstSlashIndex+1)+list[i].name;
    //url_file = url_file.replace(/\/\//,'/');
    url_file = url_file.replace(/ /g,'%20');
    url_file = url_file.replace(/,/g,'%2C');
    console.log('Addding file',list[i].name);
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

     });
    //client.get(synoUrl+'/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=1&method=create&uri='+url_file+'&_sid='+sid+destFolderArg,function(data,response){
    //  console.log('>>>>>>>>>>>>>>task added',list[i].name);
      //console.log(url_file);
    //});
  }
  //CleanUpDownloadTasks(sid);
}

let CleanUpDownloadTasks = (sid) => {
  client.get(synoUrl+'/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=1&method=list&additional=file&_sid='+sid, function (data, response) {
    var jsonResponse = JSON.parse(data);
    var tasks = jsonResponse.data.tasks;
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].status == 'finished') {
        //console.log('Removing '+tasks.title+' from download tasks');
        //client.get('http://192.168.1.200:5555/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=1&method=delete&id='+tasks[i].id+'&_sid='+sid,function(data,response){});
      }
    }
  });
};

let RemoveFilesFromServer = (files) => {
  var args = {
    data: files,
    headers: { "Content-Type": "application/json" }
  };
  client.delete('http://localhost:8088/files',args,function(data,response){});
};

for (;;) {
  sleep(loopTime).then(loginToRemoteServer(remoteUser,remotePassword));
}
