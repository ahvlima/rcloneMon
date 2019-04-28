// Part of rcloneMon
// (c) Copyright 2019 - 2AS Sistemas Ltda
// Version 0.9b

// Init variables
var lastTime=new Date();
var lastBytes=0;
var speedArray=[];
var speedAvgArray=[];
var chart;
var job;
var worker;
var fileInfo=[{}];
var statusFile;

function rcloneRC(cmd,json,callback=null) {
    var url=worker.url+'/'+cmd;
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
    .catch(error => {
        if (window.top==window.self) {                          // Ignore message if inside iframe
            setError(`No connection to rclone Remote Control on ${worker.url}.<br>`+
                     'rclone may not be running or there is a network problem.<br>'+
                     'Please verify that rclone is running and that the host is reacheable and reload.');
        }
    });
}

function mkFileInfo(f) {
    var info={};
    info.name=f.name;
    var size=f.size.toString().formatBytes();
    var transferred=f.bytes.toString().formatBytes();
    info.percentage=f.percentage;
    info.ratio=transferred+'/'+size;
    info.speedAvg=f.speedAvg.toString().formatBytes();
    info.eta=(f.eta) ? f.eta.toString().formatSeconds() : '';
    info.inuse=true;
    return info;
}

function processStats(result) {
    // Calculate displayable results
    var now=new Date();
    var bytesTransferred=result.bytes.toString().formatBytes(3);
    var filesTransferred=result.transfers;
    if (job.status) {                           // Loaded separately 
        if (job.status.totalbytes) bytesTransferred += ' / ' + job.status.totalbytes.toString().formatBytes(3);
        if (job.status.totalfiles) filesTransferred+=' / '+job.status.totalfiles;
    }
    var elapsedTime=result.elapsedTime.toString().formatSeconds();
    var speedAvg=result.speed.toString().formatBytes(3);
    var timeInterval=(now-lastTime)/1000;
    if (lastBytes) {
        var speed=(result.bytes-lastBytes)/timeInterval;
        if (worker.bandwidth.speedcap) speed=Math.min(worker.bandwidth.speedcap,speed);
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
                    addProgressBar(tr.cells[0]);                            // Add progress bar in cell
                }
                var tr=table.rows[r];                                       // Fetch current row
                tr.cells[0].innerHTML=f.name;
                tr.cells[1].innerHTML=f.ratio;
                tr.cells[2].innerHTML=f.speedAvg+'/s';
                tr.cells[3].innerHTML=f.eta;
                tr.style.display='table-row';                               // Make visible
                tr=table.rows[++r];                                         // Move to next row                                                                           
                setProgressBar(tr,f.percentage);                            // Adjust progress bar
                tr.style.display='table-row';                               // Make visible

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
    document.getElementById('bytes').innerHTML=bytesTransferred;
    document.getElementById('files').innerHTML=filesTransferred;
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

function addProgressBar(progress) {                                 // Progress is the main container (external)
    var holder=document.createElement('div');                       // Holder is the anchor for positioning all other elements inside
    var full=document.createElement('div');                         // Full bar  
    var current=document.createElement('div');                      // Current bar
    var digits1=document.createElement('div');                      // Digits in the full bar
    var digits2=document.createElement('div');                      // Digits in the current bar
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

function setProgressBar(progress,percentage) {
    var current=progress.getElementsByClassName('current-bar')[0];
    var full=progress.getElementsByClassName('full-bar')[0];
    var digits=progress.getElementsByClassName('progress-digits');
    var fullSize=full.offsetWidth;
    current.style.width=percentage*fullSize/100+'px';
    digits[0].innerHTML=percentage+'%';
    digits[1].innerHTML=percentage+'%'; 
}

function setBW(e) {
    rcloneRC('core/bwlimit',{"rate":e.target.value});
}

function readProgress() {
    loadJSON(statusFile, function(status) {
        if (status) {
            job.status=status;
            document.getElementById('stats').rows[0].style.display='table-row';
            document.getElementById('started').innerHTML=status.starttime;
            if (status.ETA) document.getElementById('eta').innerHTML=status.ETA;
            if (status.bandwidth && document.getElementById('bandwidth').style.display=='block') {
                document.getElementById('bwsel').value=(status.bandwidth=='unlimited') ? 'off' : status.bandwidth;
            } 
        } else {
            stats.style.display='none';
        }
        setTimeout(function(){readProgress();},10000);                          // Next up!
    });
}

function rcInit() {
    document.getElementById('result').style.display='none';                     // Start by hiding results pane
    var jobName=getParameterByName('job');
    if (jobName) {
        loadJSON('config.json',function(config) {
            if (config) {
                if (!config.jobs.some(function(job) {
                    if (job.name==jobName) {
                        if (!config.workers.some(function(worker) {
                            if (worker.name==job.worker) {
                                monitorStart(job,worker);
                                return true;
                            }
                        })) {
                            setError(`Cannot find worker "${job.worker}" in configuration file`);
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

function monitorStart(j,w) {
    job=j;              // Make it global
    worker=w;           // Make it global
    // Define URLs for links and data
    baseURL=(job.baseurl) ? job.baseurl : ((worker.baseurl) ? worker.baseurl : '');
    var logFile=(job.logfile) ? job.logfile : ((worker.logfile) ? worker.logfile : '');
    statusFile=(job.statusfile) ? job.statusfile : ((worker.statusfile) ? worker.statusfile : '');
    if (logFile.substring(0,1)!='/' && 
        logFile.substring(0,7)!='http://' && 
        logFile.substring(0,7)!='https://') logFile=baseURL+logFile;
    if (statusFile.substring(0,1)!='/' && 
        statusFile.substring(0,7)!='http://' && 
        statusFile.substring(0,7)!='https://') statusFile=baseURL+statusFile;
    // Init the GUI screen
    if (window.self===window.top) {
        document.getElementById('head').innerHTML=`rclone job running on ${job.worker} (${worker.url})`;
    } else {
        document.getElementById('head').innerHTML=`Job "${job.name}" running on ${job.worker}`;
        document.body.classList.add('alternate-background');
    }
    if (logFile) {
        document.getElementById('logfile').addEventListener('click', () => { window.open(logFile) });
    } else {
        document.getElementById('logfile').style.display='none';
    }
    // Bandwidth control
    if (worker.bandwidth && worker.bandwidth.settings) {
        var bwset=document.getElementById('bwsel');
        Object.keys(worker.bandwidth.settings).forEach(function(v) {
            t=worker.bandwidth.settings[v];
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
                       transition:{duration:0},
                       size:{height:240,width: 480},
                       types:{'speed':'area-spline','Average Speed':'area-spline'},
                       axis:{y:{tick:{format:function(d){return d.toString().formatBytes();}}},
                             x:{tick:{format:function(d){var t=100-d; return '-'+t.toString().formatSeconds();}}}}
                      });
    // Kick it!
    job.progress=null;                                              // Initialize progress information
    document.getElementById('stats').rows[0].style.display='none';  // Hide progress row
    if (statusFile) setTimeout(function(){readProgress();},50);     // If availabel, fetch progress information
    rcloneRC('core/stats',null,processStats);                       // Go for the main info
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