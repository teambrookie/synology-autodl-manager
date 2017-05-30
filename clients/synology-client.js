let request = require('superagent');
let feral = require('./feral-client');
let sid = '';


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
      console.error('Error trying to connect to destination server (timeout)')
    }
    else{
      let jsonResponse = JSON.parse(res.text);
      if (jsonResponse.error) {
        console.error(jsonResponse.error.code);
      }
      else {
        console.log('>>Login success to destination server');
        sid = jsonResponse.data.sid;
        GetDownloadTaskList(sid);
      }
    }
  })
};

let GetDownloadTaskList = () => {
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
       console.error('Error trying to connect to destination server (timeout)')
     }
     else{
       let jsonResponse = JSON.parse(res.text);
       if (jsonResponse.error) {
         console.error(jsonResponse.error.code);
       }
       else {
         console.log('>>Listing tasks ok');
	       currentTasksCount = jsonResponse.data.tasks.length;
         feral.GetRemoteFileList(jsonResponse.data.tasks, sid);
       }
     }
   });
};


let AddOneFileToDownloadList = (jsonFile) => {
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

let DeleteTask = (jsonFile) => {
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

module.exports = {
	loginToDestServer: function(user,password){
		return loginToDestServer(user,password);
	},
  GetDownloadTaskList: function(){
		return GetDownloadTaskList();
	},
  AddOneFileToDownloadList:function(jsonFile){
    return AddOneFileToDownloadList(jsonFile);
  },
  DeleteTask: function(jsonFile){
    return DeleteTask(jsonFile);
  }
}
