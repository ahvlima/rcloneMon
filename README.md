# rcloneMon
Web based remote monitor for rclone jobs

# Concepts

rcloneMon is a simple web based remote monitor for rclone **jobs** running at remote or local **servers** (instances of rclone running with Remote Control enabled).
It's aimed at headless setups (like NAS boxes) but can also be used to remote monitor jobs running on workstations. 

Due to current limitations, only a single **job** per **server** is supported (otherwise rcloneMon will show combined statistics). 
At this time, to properly monitor multiple **job** running on a host, use multiple **servers** on different **ports** (`--rc-addr`).

## Future development

Once (and if) rclone provides per job statistics (for asynchronous jobs in a single rclone instance),
rcloneMon will be enhanced to allow multiple simultaneous **jobs** on a **server**.

Current goals are:

1. Add an acompanying job start/status script, for use in headless systems, using the same `config.json` file.
2. Support progress information for overall job [require feature change in rclone]
3. Support asynchronous jobs [require feature change in rclone]
4. Create a modular component
5. Create a multi-job monitor
6. Add full job status over time (babysiting)

# Dependencies

rcloneMon don't require a webserver, as rclone can be used to serve the files, with `--rc-files`. 

There is a single dependency: transfer speed graphics use [C3.js](https://c3js.org/), as well as its dependency [D3.js](https://d3js.org/).

# Installing

All project files, including C3.js (c3.min.js) and D3.js (d3.min.js) must be placed in a single directory on a web server or under the directory structure 
specificed on rclone `--rc-files` option. 

Using a different webserver or monitoring jobs on a different host is possible because the current implementation of rclone does not enforce CORS.


# Configuration

The `config.json` file must be placed on the same directory as all other files. It defines all **jobs** and associated **servers**, to be monitored by rcloneMon.

```
{
    "servers": [ {
                    "name":"user defined server name",                
                    "addr":"http://server.exemple.com:5572",
                    "description":"User defined server description",
                    "speedcap":2883584,
                    "bwidth":{"500K":"500KBps","1M":"1MBps","1.5M":"1.5MBps","2M":"2MBps","2.5M":"2.5MBps","3M":"3MBps","off":"Unlimited"},
                    "logfile":"rclone.log"
    } ],
    "jobs": [ {
                  "name":"user defined job name",
                  "server":"name of the server where job runs",
                  "commnand":"this is the command to be executed to start the job - not implemented yet",
                  "description":"user define description for the job"
    } ]
}
````
servers
* name : user defined server name, used to address the link to the server from the job array
* addr : URL for the rclone instance
* description : user defined server description
* speedcap : max bandwidth in bytes available. If defined, will be used to prevent out-of-bounds errors in speed calculations.
* bwidth: list of bandwidth values to use in setting the control. key is passed to rclone and value is displayed.
* logfile: URL for retrieving the log file. Can be relative to the main HTML file. Use `--log-file` to create it.

jobs
* name : user defined job name, used to select the job from the URL (http://rclone.exemple.com:5572?job=job+name) 
* server : name of the server where the job is running
* command : [not implemented yet] will contain the command to start rclone for this job
* description: user defined description for the job


# Using

## Authentication

Basic authentication `--rc-user` + `--rc-pass` or `--rc-htpasswd` can be used without problems and the web browser will ask for the authentication only once per session.

Once the web server (stand alone or rclone) is running, open the rcloneMon URL on a web browser, pointing to the **server** and passing the **job** name as a paramenter:

`http://server.example.com:5572?job=Backup+job`

The command above assumes a **job** name of "Backup job".




