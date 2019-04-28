// Part of rcloneMon
// (c) Copyright 2019 - 2AS Sistemas Ltda
// Version 0.9b

// Status to color map
var statusColors={'running':'blue','ended':'green','failed':'red'};

function loadStatus(job,worker,statusFile,div) {
    loadJSON(statusFile,function(status) {
        if (status) {
            var progress=null;          // Will indicate we need to update the progress bar
            var percentage;             // Set proper scope
            var table=document.createElement('table');
            table.classList.add('job-container');
            addRow(table,[{'value':'Job'},{'value':job.name,'class':'bold'}]);
            addRow(table,[{'value':'Worker'},{'value':job.worker}]);
            addRow(table,[{'value':'Status'},{'value':status.status,'class':statusColors[status.status]}]);
            addRow(table,[{'value':'Started'},{'value':status.starttime}]);
            var monitorURL=`${worker.url}/rcloneMon.html?job=${encodeURIComponent(job.name)}`;
            if (status.status=='running') {
                if (status.transferredfiles) {
                    addRow(table,[{'value':'Files Transferred'},{'value':`${status.transferredfiles} / ${status.totalfiles}`}]);
                    addRow(table,[{'value':'Bytes Transferred'},{'value':`${status.transferredbytes.toString().formatBytes(3)} / ${status.totalbytes.toString().formatBytes(3)}`}]);
                    tr=addRow(table,[{'value':'','span':2}]);
                    progress=tr.firstElementChild;
                    addProgressBar(progress);
                    percentage=Math.floor(status.transferredbytes*100/status.totalbytes);
                    addRow(table,[{'value':'ETA'},{'value':status.ETA}]);
                    if (status.errors) addRow(table,[{'value':'Errors'},{'value':status.errors}]);
                }
                if (status.bandwidth) addRow(table,[{'value':'Bandwidth Limit'},{'value':status.bandwidth}]);
                var tr=addRow(table,[{'value':'Open Monitor Window'},{'value':''}]);
                tr.firstElementChild.addEventListener('click', () => { monitoring=job.name; document.getElementById('monitor-frame').src=monitorURL; });
                tr.firstElementChild.classList.add('monitor-link');
            } else {
                addRow(table,[{'value':'Ended'},{'value':status.endtime}]);
                if (status.elapsed) addRow(table,[{'value':'Elapsed Time'},{'value':status.elapsed}]);
                if (status.lastrc) addRow(table,[{'value':'Return Code'},{'value':status.lastrc}]);
            }
            if (div.childNodes[0]) div.removeChild(div.childNodes[0]);          // Remove old table (should release memory)
            div.appendChild(table);                                             // Add new one
            // Now that the table is in the DOM, we can adjust the progress bar
            if (progress!==null) {
                setProgressBar(progress,percentage);
            }
            if (status.status!=job.state && monitoring==job.name) {
                document.getElementById('monitor-frame').src=(status.status=='running') ? monitorURL : 'about:blank';
            }
            job.state=status.status;
        } else {
            div.style.display='none';       // No data for this job - hide it
        }
        setTimeout(function(){loadStatus(job,worker,statusFile,div);},5000);
    });
}

function doInit() {
    monitoring=null;                                // No job in the monitor window/iframe
    document.getElementById('monitor-frame').src='about:blank';
    loadJSON('config.json',function(config) {
        if (config) {
            var joblist=document.getElementById('joblist');
            config.jobs.sort(function(a,b) {                    // Sort by job "name"
                var x=a.name.toLowerCase();
                var y=b.name.toLowerCase();
                return x<y ? -1 : x>y ? 1 : 0;
            });
            config.jobs.forEach(function(job) {        
                var div=document.createElement('div');          // This is where results will be placed, when ready (async)
                joblist.appendChild(div);                       // Put in the right place (already sorted)
                var worker=null;
                config.workers.some(function(worker) {
                    if (worker.name==job.worker) { 
                        // Define URLs for links and data
                        baseURL=(job.baseurl) ? job.baseurl : ((worker.baseurl) ? worker.baseurl : '');
                        statusFile=(job.statusfile) ? job.statusfile : ((worker.statusfile) ? worker.statusfile : '');
                        if (statusFile.substring(0,1)!='/' && 
                            statusFile.substring(0,7)!='http://' && 
                            statusFile.substring(0,7)!='https://') statusFile=baseURL+statusFile;
                        // Try loading statusFile and process it
                        job.state=null;
                        loadStatus(job,worker,statusFile,div);
                        return true;
                    }
                });
            }); 
        };
    });
}

//Bootstrap everything
document.addEventListener("DOMContentLoaded",doInit,false); 

// Auxiliary (app specific code)
//
// Add a progress bar to block element
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

// Adjust a progress bar
function setProgressBar(progress,percentage) {
    var current=progress.getElementsByClassName('current-bar')[0];
    var full=progress.getElementsByClassName('full-bar')[0];
    var digits=progress.getElementsByClassName('progress-digits');
    var fullSize=full.offsetWidth;
    current.style.width=percentage*fullSize/100+'px';
    digits[0].innerHTML=percentage+'%';
    digits[1].innerHTML=percentage+'%';
}


// Add a row with n cols in table. Cols is an array of [classes or null]!
function addRow(table,cols) {
    var tr=table.insertRow(-1);
    cols.forEach(function(tdData) {
        var td=tr.insertCell(-1);
        if (tdData.value) td.innerHTML=tdData.value;
        if (tdData.class) td.classList.add(tdData.class);
        if (tdData.span) td.colSpan=tdData.span;
    });
    return tr;
}

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
