let acceptedExtensions = ['mkv','avi','mp4','srt'];

let FilterListByExtension = (listFiles) => {
	let filteredList = [];
	for (let i=0 ; i< listFiles.length ; i++){
		for(let j=0;j<acceptedExtensions.length;j++){
			if(listFiles[i].extension == '.'+acceptedExtensions[j]){
				filteredList.push(listFiles[i]);
				break;
			}
		}
	}
	return filteredList;
}

module.exports = {
	filterListByExtension: function(listFiles){
		return FilterListByExtension(listFiles);
	}
}
