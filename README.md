# synology-autodl-manager

A little node program that will get file list from remote server and add them to synology download station utility.

## HOW TO
~~~~
docker run --name name_here -d -e REMOTE_USER=a -e REMOTE_PASSWORD=b -e DS_USER=a -e DS_PASSWORD=b -e ROOT_PATH_REMOTE_SERVER=path -e DS_URL=url teambrookie/synology-autodl-manager
~~~~
