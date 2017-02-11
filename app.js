let cronConfig = process.env.CRON_CONFIG || '0 */3 * * * *';
let remoteUser = process.env.REMOTE_USER || 'default_user';
let remotePassword = process.env.REMOTE_PASSWORD || 'no_password';
let destPassword = process.env.DS_PASSWORD || 'no_password';
let destUser = process.env.DS_USER || 'default_user';
let rootUrlServer = process.env.ROOT_PATH_REMOTE_SERVER || 'http://bloodmaker.anax.feralhosting.com/links/';
let synoUrl = process.env.DS_URL || 'http://192.168.1.200:5555';
let remoteUrl = process.env.REMOTE_URL || 'http://anax.feralhosting.com:8088';
let remoteToken;
var request = require('superagent');
let CronJob = require('cron').CronJob;
let acceptedExtensions = ['mkv','avi','mp4','srt'];
let destFolder = process.env.DS_DEST_FOLDER || undefined;
let maxTasksCount = 30;
let currentTasksCount = 30;
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
      remoteToken = res.text;
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
	 currentTasksCount = jsonResponse.data.tasks.length;
         GetRemoteFileList(jsonResponse.data.tasks, sid);
       }
     }
   });
};

let FilterListByExtension = (tasks, listFiles, sid) => {
	let filteredList = [];
	for (let i=0 ; i< listFiles.length ; i++){
		for(let j=0;j<acceptedExtensions.length;j++){
			if(listFiles[i].extension == '.'+acceptedExtensions[j]){
				filteredList.push(listFiles[i]);
				break;
			}
		}
	}
	CompareAndBuildCommonList(tasks,filteredList,sid);
}

/* Here we'll build a 'common' list containing information
 of both servers (source server informations as well as destination server)
 The said list will follow the following format:
[
        {
                "path":"path",
                "name":"name",
                "extension":".mkv",
                "status":"finished",
                "DS_id":123
        }
]
*/
let CompareAndBuildCommonList = (tasks,listFiles,sid) => {
  console.log('Compare sources files to current tasks');
  let fileToAddToDownloadList = [];
  let fileToRemoveFromServer = [];
  for (let i = 0; i < listFiles.length; i++) {
    let remoteItem = listFiles[i];
    let alreadyExists = false;
    let finished = false;
    for (let j = 0; j < tasks.length; j++) {
      // file on source server is already added on destination server
      let taskTitle = tasks[j].title;
      taskTitle = taskTitle.replace(/%20/g,' ');
      taskTitle = taskTitle.replace(/%2C/g,',');
      taskTitle = taskTitle.replace(/%23/g,'#');
      if (remoteItem.name == taskTitle) {
	listFiles[i].status = tasks[j].status;
	listFiles[i].DS_id = tasks[j].id;
      }
    }
  }
  HandleCommonList(listFiles,sid);
}

let HandleCommonList =(listFiles,sid) => {
	let taskCpt = 0;
	// Due to Synology API limitation, I choose to limit the list to 20 items.
	let numberOfTasksToAdd = Math.min(20,maxTasksCount - currentTasksCount);
	for(let i=0;i<listFiles.length;i++){
		if(listFiles[i].status == undefined){
			if(taskCpt++ < numberOfTasksToAdd){
			//TODO add task to DS
			AddOneFileToDownloadList(listFiles[i],sid);
			}
		}
		else if(listFiles[i].status == 'finished'){
			//TODO clean up task THEN remove it from server
			RemoveFileFromRemoteServerThenCleanUpTaskFromDS(listFiles[i],sid);
		}
		else{
			//Task is already on DS and is either waiting to be downloaded or currently downloading the file
		}
	}
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
	FilterListByExtension(tasks,res.body,sid);
     }
   });
};

let RemoveFileFromRemoteServerThenCleanUpTaskFromDS = (jsonFile, sid) => {
	console.log('Starting to clean up file',jsonFile.name);
	let title  = jsonFile.name;
	let files = [];
	files.push(jsonFile);
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
             		console.log(title,'has been deleted on source server -> Removing associated task on DS...');
			console.log('Removing '+title+' from download tasks');
		        request
		         .get(synoUrl + '/webapi/DownloadStation/task.cgi')
		         .query({
		             api:'SYNO.DownloadStation.Task',
		             version:'1',
		             method:'delete',
		             id:jsonFile.DS_id,
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
		                      console.log('File',title +' deleted from DS');
		                   }
		                 }
		            });		
           	}
          });

}

let AddOneFileToDownloadList = (jsonFile, sid) => {
    let endPath = jsonFile.path;
    let firstSlashIndex = endPath.indexOf('/');
    let url_file = rootUrlServer+jsonFile.path.substring(firstSlashIndex+1)+jsonFile.name;
    url_file = url_file.replace(/ /g,'%20');
    url_file = url_file.replace(/,/g,'%2C');
    url_file = url_file.replace(/#/g,'%23');
    console.log('Adding file',jsonFile.name);
    request
     .get(synoUrl + '/webapi/DownloadStation/task.cgi')
     .query({
       api:'SYNO.DownloadStation.Task',
       version: '1',
       method: 'create',
       uri: url_file,
       _sid: sid,
       destination:destFolder

     })
     .end(function(err,res){
       if (err) {
         console.log('FAILED to add',jsonFile.name);
         console.log(err);
       }
       else{
         if (JSON.parse(res.text).error) {
           console.log('FAILED to add',jsonFile.name);
           console.log('error',JSON.parse(res.text).error);
         }
         else{
           console.log('File added with SUCCESS:',jsonFile.name);
         }

       }
     });
}

// ######## CRON JOB ############
new CronJob(cronConfig, function() {
  loginToRemoteServer(remoteUser,remotePassword)
}, null, true);
