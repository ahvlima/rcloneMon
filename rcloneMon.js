// Part of rcloneMon
// (c) Copyright 2019 - 2AS Sistemas Ltda
// Version 0.9

// Init variables
var lastTime=new Date();
var lastBytes=0;
var speedArray=[];
var speedAvgArray=[];
var chart;
var job;
var server;
var fileInfo=[{}];

function rcloneRC(cmd,json,callback=null) {
                                                    // console.log(json);
    var url=server.addr+'/'+cmd;
    var init={'method':'POST',
              'headers':{'Content-Type':'application/json'},
              'body':JSON.stringify(json)};
    fetch(url,init)
    .then(response => {
        if (!response.ok) throw Error(response.statusText);
        setError(null);
        return response.json();
    })
    .then(json => {if (callback) callback(json)})
    .catch(error => setError(error));
}

function mkFileInfo(f) {
    var info={};
    info.name=f.name;
    var size=f.size.toString().formatBytes();
    var transfered=f.bytes.toString().formatBytes();
    info.percentage=f.percentage;
    info.ratio=transfered+'/'+size;
    info.speedAvg=f.speedAvg.toString().formatBytes();
    info.eta=(f.eta) ? f.eta.toString().formatSeconds() : '';
    info.inuse=true;
    return info;
}

function processStats(result) {
    // Calculate displayable results
    var now=new Date();
    var bytesTransfered=result.bytes.toString().formatBytes(3);
    var elapsedTime=result.elapsedTime.toString().formatSeconds();
    var speedAvg=result.speed.toString().formatBytes(3);
    var timeInterval=(now-lastTime)/1000;
    if (lastBytes) {
        var speed=(result.bytes-lastBytes)/timeInterval;
        if (server.speedcap) speed=Math.min(server.speedcap,speed);
    } else {
        speed=0;
    }
    speedArray.push(speed);
    speedArray=speedArray.slice(2);                     // One for the new element, another for the label
    speed=speed.toString().formatBytes();
    speedAvgArray.push(result.speed);
    speedAvgArray=speedAvgArray.slice(2);               // One for the new element, another for the label
    lastTime=now;                                       // Done for this time slice. Save new reference
    lastBytes=result.bytes;                             // Save for next round
    // Add file specific information
    var r=-1;
    var table=document.getElementById('fileTable');
    if (result.transferring) {
        fileInfo.forEach(function(v,i){fileInfo[i].inuse=false;});  // Reset entries
        // Pass #1 - Handle returning guests 
        result.transferring.forEach(function(f,i) {
            result.transferring[i].status=0;
            if (f.name!==undefined) {
                result.transferring[i].status=1;
                fileInfo.some(function(fi,j){
                    if (fi.name==f.name) {
                        fileInfo[j]=mkFileInfo(f);
                        result.transferring[i].status=2;
                        return true;
                    }
                });
            }
        });
        // Pass #2 - Find unused spot for new guest, or creat a new on
        result.transferring.forEach(function(f,i) {
            if (f.status==1) {
                var placed=fileInfo.some(function(fi,j){
                    if (!fi.inuse) {
                        fileInfo[j]=mkFileInfo(f);
                        return true;
                    }
                });
                if (!placed) fileInfo.push(mkFileInfo(f));                  // Create new entrty 
            }
        });
        // Now replace information on table
        table.rows[++r].style.display='table-row';                          // Table header, in case was hidden
        fileInfo.forEach(function(f,i) {
            ++r;
            if (f.inuse) {
                if (!table.rows[r]) {                                       // Need to add a new row
                    var tr=table.insertRow(-1);                             // Data row
                    for (c=0;c<4;c++) tr.insertCell(-1);                    // Data columns
                    tr=table.insertRow(-1);                                 // Progress row
                    tr.insertCell(-1);                                      // Single progress column
                    tr.cells[0].colSpan='4';                                // spanning all 4 data columns
                    tr=table.rows[r+1];                                     // Progress bar row
                    var progress=tr.cells[0];
                    var holder=document.createElement('div');
                    full=document.createElement('div');
                    current=document.createElement('div');
                    var digits1=document.createElement('div');
                    var digits2=document.createElement('div');
                    full.appendChild(digits1);
                    current.appendChild(digits2);
                    progress.appendChild(holder);
                    holder.appendChild(full);
                    holder.appendChild(current);
                    progress.classList.add('progress');
                    holder.classList.add('holder');
                    full.classList.add('progress-bar','full-bar');
                    current.classList.add('progress-bar','current-bar');
                    digits1.classList.add('progress-digits');
                    digits2.classList.add('progress-digits');
                }
                var tr=table.rows[r];                                       // Fetch current row
                tr.cells[0].innerHTML=f.name;
                tr.cells[1].innerHTML=f.ratio;
                tr.cells[2].innerHTML=f.speedAvg+'/s';
                tr.cells[3].innerHTML=f.eta;
                tr.style.display='table-row';
                tr=table.rows[++r];                                         // Progress bar row
                var current=tr.getElementsByClassName('current-bar')[0];
                var full=tr.getElementsByClassName('full-bar')[0];
                var digits=tr.getElementsByClassName('progress-digits')
                var fullSize=full.offsetWidth;
                current.style.width=f.percentage*fullSize/100+'px';
                digits[0].innerHTML=f.percentage+'%';
                digits[1].innerHTML=f.percentage+'%';
                tr.style.display='table-row';
            } else {
                if (table.rows[r]) {
                    table.rows[r].style.display='none';                     // Not active? Hide it!!!
                    table.rows[++r].style.display='none';                   // Not active? Hide it!!!
                }
            }
        });
    } 
    while (table.rows[++r]) table.rows[r].style.display='none';             // Hide leftover rows
    // Overall information
    document.getElementById('bytes').innerHTML=bytesTransfered;
    document.getElementById('files').innerHTML=result.transfers;
    document.getElementById('elapsed').innerHTML=elapsedTime;
    document.getElementById('avgspeed').innerHTML=speedAvg;
    document.getElementById('speed').innerHTML=speed;
    document.getElementById('errors').innerHTML=result.errors;
    // Update chart 
    speedArray.unshift('Speed');
    speedAvgArray.unshift('Average Speed');
    chart.load({columns:[speedArray,speedAvgArray]});
    // Play it again, Sam!
    setTimeout(function(){rcloneRC('core/stats',null,processStats);},1000);
}

function setBW(e) {
    rcloneRC('core/bwlimit',{"rate":e.target.value});
}

function rcInit() {
    document.getElementById('result').style.display='none';                     // Start by hiding results pane
    var jobName=getParameterByName('job');
    if (jobName) {
        loadJSON('config.json',function(config) {
            if (config) {
                if (!config.jobs.some(function(job) {
                    if (job.name==jobName) {
                        if (!config.servers.some(function(server) {
                            if (server.name==job.server) {
                                monitorStart(job,server);
                                return true;
                            }
                        })) {
                            setError(`Cannot find server "${job.server}" in configuration file`);
                        }
                        return true;
                    }})) {
                    setError(`Cannot find job "${jobName}" in configuration file`);
                }
            } else {
                setError('Error loading/processing configuration file (server may be offline)');
            }
        });
    } else {
        setError('Invalid or missing job name in URL');
    }
}

function monitorStart(j,s) {
    job=j;              // Make it global
    server=s;           // Make it global
    // Init the GUI screen
    document.getElementById('head').innerHTML='rclone job running on '+server.addr;
    if (server.logfile) {
        document.getElementById('logfile').addEventListener('click',()=>{window.open(server.logfile)});
    } else {
        document.getElementById('logfile').style.display='none';
    }
    if (server.bwidth) {
        var bwset=document.getElementById('bwsel');
        Object.keys(server.bwidth).forEach(function(v) {
            t=server.bwidth[v];
            var o=document.createElement('option');
            o.value=v;
            o.text=t;
            bwsel.appendChild(o);
        });
        bwsel.addEventListener('change',setBW);
    } else {
        document.getElementById('bandwidth').style.display='none';
    }
    // Initialize chart
    for (var i=0;i<101;i++) {
        speedArray.push(0);
        speedAvgArray.push(0);
    }
    speedArray.unshift('Speed');
    speedAvgArray.unshift('Average Speed');
    chart=c3.generate({bindto: '#chart',
                       data:{columns:[speedArray,speedAvgArray],
                             types:{'Speed':'area','Average Speed':'area'}},
                       point:{show:false},
                       size:{height:240,width: 480},
                       types:{'speed':'area-spline','Average Speed':'area-spline'},
                       axis:{y:{tick:{format:function(d){return d.toString().formatBytes();}}},
                             x:{tick:{format:function(d){var t=100-d; return '-'+t.toString().formatSeconds();}}}}
                      });
    // Kick it!
    rcloneRC('core/stats',null,processStats);
}

//Bootstrap everything
document.addEventListener("DOMContentLoaded",rcInit,false); 

// Auxiliary (app specific code)
//
// Display error msg in GUI
function setError(msg) {
    if (msg) console.log(msg);
    var errorDiv = document.getElementById('error');
    if ((typeof setError===undefined) || msg===null) {
        errorDiv.innerHTML='';
        errorDiv.style.display='none';
        document.getElementById('result').style.display='block';                     
    } else {
        errorDiv.innerHTML=msg;
        errorDiv.style.display='block';
        document.getElementById('result').style.display='none';                     
    }
}

// Support Code
// 
// Augment string object
(function() {
    // Format seconds in h:mm:ss
    this.formatSeconds=function () {
        var s=parseInt(this,10);
        var h=Math.floor(s/3600);
        var m=Math.floor((s-(h*3600))/60);
        s=s-(h*3600)-(m*60);
        if (m<10) m="0"+m;
        if (s<10) s="0"+s;
        return (h+':'+m+':'+s).replace(/^[0:]+/,'');
    }
    // Format as bytes with optional decimals
    this.formatBytes=function(decimals=2) {
        if (this==0) return '0 Bytes';
        var k=1024;
        var dm=decimals < 0 ? 0 : decimals;
        var sizes=['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        var i=Math.floor(Math.log(this) / Math.log(k));
        return parseFloat((this / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
}).call(String.prototype);

// Load and return a JSON from URL
function loadJSON(url,callback) {
    fetch(url)     
    .then(response => {
        if (!response.ok) throw Error(response.statusText);
        return response.json();
    })
    .then(json => callback(json))
    .catch(error => callback());
}

// Extract QueryString parameter by name from URL (defaults to current)
function getParameterByName(name,url) {
    if (!url) url=window.location.href;
    name=name.replace(/[\[\]]/g, "\\$&");
    var regex=new RegExp("[?&]"+name+"(=([^&#]*)|&|#|$)"),
    results=regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}