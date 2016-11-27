let Client = require('node-rest-client').Client;
let client = new Client();
let password = process.env.DS_PASSWORD;
let user = process.env.DS_USER;
let rootUrlServer = 'http://bloodmaker.anax.feralhosting.com/links/';

// registering remote methods
client.registerMethod('getRemoteFileList', 'http://anax.feralhosting.com:8088/files', 'GET');

client.registerMethod('devCall','http://localhost:8088/files','GET');

client.registerMethod('synoLogin','http://192.168.1.200:5555/webapi/auth.cgi?api=SYNO.API.Auth&version=2&method=login&account='+user+'&passwd='+password+'&session=DownloadStation&format=sid','GET');

client.methods.synoLogin((data, response) => {
  let jsonResponse = JSON.parse(data);
  if (jsonResponse.success) { // no error in logging
    sid = jsonResponse.data.sid;
    console.log("Logged in",sid);
    GetDownloadTaskList(sid);
  }
  else{
    console.log(jsonResponse.error);
  }
});

let GetDownloadTaskList = (sid) => {
  client.get('http://192.168.1.200:5555/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=1&method=list&additional=file&_sid='+sid, function (data, response) {
    var jsonResponse = JSON.parse(data);
    var tasks = jsonResponse.data.tasks;
    CompareRemoteToLocal(tasks,sid);
  });
};

let CompareRemoteToLocal = (tasks,sid) => {
  let fileToAddToDownloadList = [];
  let fileToRemoveFromServer = [];
  client.methods.devCall((data, response) => {
    for (let i = 0; i < data.length; i++) {
      let remoteItem = data[i];
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
    RemoveFilesFromServer(fileToRemoveFromServer);
  });
};

let AddFileToDownloadList = (list,sid) => {
  for (let i = 0; i < list.length; i++) {
    let endPath = list[i].path;
    let firstSlashIndex = endPath.indexOf('/');
    let url_file = 'http://localhost/'+list[i].path.substring(firstSlashIndex+1)+list[i].name;
    url_file = url_file.replace(/ /g,'%20');
    console.log('adding file with url',url_file);
    client.get('http://192.168.1.200:5555/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=1&method=create&uri='+url_file+'&_sid='+sid,function(data,response){
      console.log('task added',JSON.parse(data));
    });
  }
  CleanUpDownloadTasks(sid);
}

let CleanUpDownloadTasks = (sid) => {
  client.get('http://192.168.1.200:5555/webapi/DownloadStation/task.cgi?api=SYNO.DownloadStation.Task&version=1&method=list&additional=file&_sid='+sid, function (data, response) {
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
