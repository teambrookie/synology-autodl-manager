# synology-autodl-manager

A little node program that will get file list from remote server and add them to synology download station utility.

## HOW TO
~~~~
docker run --name name_here -d --env-file=env.list teambrookie/synology-autodl-manager
~~~~
You'll need to define a env.list file as following:

~~~~
REMOTE_USER=user
REMOTE_PASSWORD=password
REMOTE_URL=url_ws
ROOT_PATH_REMOTE_SERVER=url_http
DS_USER=user
DS_PASSWORD=password
DS_URL=192.168.1.200:5555
DS_DEST_FOLDER=path_to_DSM_shared_folder
CRON_CONFIG='0 */15 * * * *'
~~~~
