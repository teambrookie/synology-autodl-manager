/*var json_src = {
  "path": "./test_folder",
  "name": "test_folder",
  "type": "folder",
  "children": [
    {
      "path": "./test_folder/folder_1",
      "name": "folder_1",
      "type": "folder",
      "children": [
        {
          "path": "./test_folder/folder_1/file1.mkv",
          "name": "file1.mkv",
          "type": "file"
        }
      ]
    },
    {
      "path": "./test_folder/folder_2",
      "name": "folder_2",
      "type": "folder",
      "children": [
        {
          "path": "./test_folder/folder_2/file1.mkv",
          "name": "file1.mkv",
          "type": "file"
        },
        {
          "path": "./test_folder/folder_2/file2.mkv",
          "name": "file2.mkv",
          "type": "file"
        }
      ]
    }
  ]
};
*/
var json_src ="";
var Client = require('node-rest-client').Client;
var client = new Client();
var list_files = [];
// direct way
/*client.get("http://anax.feralhosting.com:8088/files", function (data, response) {
    // parsed response body as js object
    //var json_src = data;
    console.log(data);
    // raw response
    //console.log(response);
});*/

// registering remote methods
client.registerMethod("jsonMethod", "http://anax.feralhosting.com:8088/files", "GET");

client.methods.jsonMethod(function (data, response) {
    // parsed response body as js object
    console.log(data);
    var json_src = data;
    list_files = []
    // raw response
    //console.log(response);
    findFilesRecursively(json_src);
    console.log(list_files);
});


function findFilesRecursively(json){
    if(json.type == "file"){
      list_files.push(json.path);
    }
    else {
      for (var i = 0; i < json.children.length; i++) {
        var child = json.children[i];
        findFilesRecursively(child);
      }
    }
}
