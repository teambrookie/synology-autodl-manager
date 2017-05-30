let request = require('superagent');
let synology = require('./synology-client');
let business = require('../utils/business');
let filter = require('../utils/filter');
let remoteToken = '';

let loginToRemoteServer = (user,pass) => {
  console.log('Login to source server');
  console.log('logging to',remoteUrl + '/auth');
  request
  .post(remoteUrl + '/auth')
  .set('Content-Type', 'application/x-www-form-urlencoded')
  .send({ username: user, password: pass })
  .end(function(err, res){
    if (err) {
      console.error('Login failed');
      console.error(res);
      remoteToken = null;
    }
    else {
      remoteToken = res.text;
      console.log('>>Login success to source server');
      synology.loginToDestServer(destUser,destPassword);
    }
  });
};

let GetRemoteFileList = (tasks) => {
  console.log('Getting file list from source server with token '+remoteToken);
  request
   .get(remoteUrl + '/files')
   .set('Accept','application/json')
   .set('Authorization', 'Bearer '+remoteToken)
   .end(function(err,res){
     if (err) {
       console.error('FAILED');
       console.error(err);
     }
     else{
       console.log('Getting list of files SUCCESS');
	      let filteredList = filter.FilterListByExtension(res.body);
        business.CompareAndBuildCommonList(tasks,filteredList);
     }
   });
};

let RemoveFileFromRemoteServer = (jsonFile) =>{
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
           synology.DeleteTask(jsonFile);
         }
       });
}

module.exports = {
	loginToRemoteServer: function(user,password){
		return loginToRemoteServer(user,password);
	},
  GetRemoteFileList: function(tasks){
		return GetRemoteFileList(tasks);
	},
  RemoveFileFromRemoteServer:function(jsonFile){
    return RemoveFileFromRemoteServer(jsonFile);
  }
}
