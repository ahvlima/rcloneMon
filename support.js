// Part of rcloneMon
// (c) Copyright 2019 - 2AS Sistemas Ltda
// Version 0.9b

// Support/Common Javascript 
// 
// Augment string object
(function() {
    // Format seconds in HHhMMmSSs (true) or hh:mm:ss (false)
    this.formatSeconds=function(unit=true) {
        var s=parseInt(this,10);
        var h=Math.floor(s/3600);
        var m=Math.floor((s-(h*3600))/60);
        s=s-(h*3600)-(m*60);
        if (m<10) m="0"+m;
        if (s<10) s="0"+s;
        if (unit) {
            return (h+'h'+m+'m'+s+'s').replace(/^[0:hm]+/,'');
        } else {
            return (h+':'+m+':'+s).replace(/^[0:]+/,'');
        }
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

// Load and return a JSON from URL (ignore cache)
function loadJSON(url,callback) {
    var init={'headers':{'pragma':'no-cache','cache-control':'no-cache'}};
    fetch(url,init)
    .then(response => {
        if (!response.ok) throw Error(response.statusText);
        return response.json();
    })
    .then(json => callback(json))
    .catch(error => callback());
}
