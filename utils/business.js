let synology = require('../clients/synology-client');
let feral = require('../clients/feral-client');

let maxTasksCount = 30;
let currentTasksCount = 30;

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
let CompareAndBuildCommonList = (tasks,listFiles,callback) => {
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
  callback(listFiles);
}

let HandleCommonList =(listFiles) => {
	let taskCpt = 0;
	// Due to Synology API limitation, I choose to limit the list to 20 items.
	let numberOfTasksToAdd = Math.min(20,maxTasksCount - currentTasksCount);
  if(listFiles != null){
    for(let i=0;i<listFiles.length;i++){
  		if(listFiles[i].status == undefined){
  			if(taskCpt++ < numberOfTasksToAdd){
          synology.AddOneFileToDownloadList(listFiles[i]);
  			}
  		}
  		else if(listFiles[i].status == 'finished'){
  			feral.RemoveFileFromRemoteServer(listFiles[i]);
  		}
  		else{
  			//Task is already on DS and is either waiting to be downloaded or currently downloading the file
  		}
  }

	}
}


module.exports = {
	CompareAndBuildCommonList: function(tasks,ListFiles){
		return CompareAndBuildCommonList(tasks,ListFiles);
	},
  HandleCommonList: function(ListFiles){
		return HandleCommonList(ListFiles);
	}
}
