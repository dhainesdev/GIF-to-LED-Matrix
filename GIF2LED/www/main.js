
var frames, width, height, delay, filename, device, pin, devman;

//GIF Frames
var genframes = [];

function init(){
    // Set up touch events for mobile, etc
    window.addEventListener("touchmove", function(e) {
        var touch = e.touches[0];
        var mouseEvent = new MouseEvent("mousemove", {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        window.dispatchEvent(mouseEvent);
    }, false);
    window.addEventListener("resize", function() {
		positionPicker();
		$('#clippingdiv').trigger('resize')
    });
    window.addEventListener("scroll", function() {
		positionPicker();
    });
	devman = new DeviceManager();
}
window.addEventListener("load", init, false);


function positionPicker(){
		var stpthr = $(".stpthr");
		var sctop = $(window).scrollTop();
		var offst = stpthr.offset();
		var w = stpthr.width();
		var top = Math.max(sctop, offst.top);
		$("#spcontainer").css("position", "absolute").css("top", top+"px").css("left", offst.left+w+30+"px");	
}

function concatTypedArrays(a, b) { // a, b TypedArray of same type
    var c = new (a.constructor)(a.length + b.length);
    c.set(a, 0);
    c.set(b, a.length);
    return c;
}

function getmouse(event){
    currentElement = document.getElementById(event.target.id);
    var totalOffsetX = 0;
    var totalOffsetY = 0;
    var canvasX = 0;
    var canvasY = 0;
    do{
        totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
        totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
    }
    while(currentElement = currentElement.offsetParent)

    canvasX = event.pageX - totalOffsetX;
    canvasY = event.pageY - totalOffsetY;
    return {x:canvasX, y:canvasY}
}
class Device {
    constructor() {
            this.id;
            this.type;
            this.pin;
            this.datalength;
            this.width;
            this.height;
            this.frameData = [];
            this.currentFrame = 0;
    }
}

class Neopixel extends Device {
    constructor(parent, id) {
        super();
        this.id = id;
        var holder = parent;
        this.mdown = -1;
        var elem = document.createElement("canvas");
        elem.setAttribute("id", id);
		elem.setAttribute("class", "device");
        holder.appendChild(elem);
        this.canvas = document.getElementById(id);
        this.ctx = this.canvas.getContext('2d');
		//edit/paint vars
		this.flag = false;
    }
    createframes(number, width, height, clip){
        this.width = width;
        this.height = height;
        this.frameData = [];
        for (var x=0; x<number; x++){
            this.frameData[x] = document.createElement('canvas');
			this.frameData[x].width = width;
			this.frameData[x].height = height;
			
            var ictx = this.frameData[x].getContext("2d");
            //ictx.fillStyle = '#000000';
            //ictx.fillRect(0, 0, width, height);
            ictx.drawImage(genframes[x], clip.x, clip.y, clip.w, clip.h, 0, 0, width, height);
        }
    }
    draw(frame){
        this.currentFrame = frame;
         if(this.height<this.width){
             var windowW = this.canvas.width  = Math.max(Math.min(window.innerWidth, 800),10);//800 max seems reasonable
             var windowH = this.canvas.height = Math.min(windowW*(this.height/this.width), 800);
         }else{
             var windowH = this.canvas.height = Math.min(window.innerWidth, 800);
             var windowW = this.canvas.width  = Math.min(Math.max(windowH*(this.width/this.height), 10), 800);
         }
        this.ctx.drawImage(this.frameData[frame], 0, 0, this.frameData[frame].width, this.frameData[frame].height, 0, 0, windowW, windowH);
    }
    data(frame){
        if (typeof this.frameData[frame] == 'undefined'){
            return 0;
        }
        var ectx = this.frameData[frame].getContext("2d");
        if(ectx == null){
            return 0;
        }
        var pixels = ectx.getImageData(0, 0, this.frameData[frame].width, this.frameData[frame].height);
        var pixelData = pixels.data;
        var buffer = new ArrayBuffer(pixelData.length*.75); // that's from x/4*3 to drop alpha
        var binary = new Uint8Array(buffer);
        var len = pixelData.length;
        var i = 0;
        for(var j=0; j<len; j+=4){
            binary[i] = pixelData[j+1];
            binary[i+1] = pixelData[j]
            binary[i+2] = pixelData[j+2]
            i += 3;
        }
        var blobyhill = new Blob([binary.buffer], {type: 'application/octet-stream'});
        return blobyhill
      }
      edit(mx, my, color, res){
		var frame = this.currentFrame;
        var width = this.frameData[frame].width;
        var height = this.frameData[frame].height;
        var ectx = this.frameData[frame].getContext("2d");
        var pixels = ectx.getImageData(0, 0, width, height);
        var pixelData = pixels.data;
		//row multiplier
        var rowM = Math.floor(width) * 4;
        //cordinates to edit
        var x = Math.floor((width/this.canvas.width)*mx);
        var y = Math.floor((height/this.canvas.height)*my);
		const [r, g, b] = color.match(/\w\w/g).map(x => parseInt(x, 16));
		if (res == 'down') {
            this.flag = true;
        }
        if (res == 'up' || res == "out") {
            this.flag = false;
        }
        if (res == 'move') {
            if (this.flag) {
				pixelData[x*4+(y*rowM)] = r;
				pixelData[x*4+(y*rowM)+1] = g;
				pixelData[x*4+(y*rowM)+2] = b;
				ectx.putImageData(pixels, 0, 0);
				this.draw(this.currentFrame);
            }
        }
        return 1;
    }
}

class PWM extends Device {
    constructor(parent, id) {
        super();
        this.id = id;
        var holder = parent;
        this.element = document.createElement("div");
        this.element.setAttribute("id", id);
		elem.setAttribute("class", "device");
        this.element.innerHTML =
        '  <p>Duty Cycle:</p>'+
        '  <input type="range" style="width:800px" min="0" max="1023" value="0" class="slider" id="'+id+'dty">'+
        '  <div id="'+id+'dtydisp">0</div>'+
        '  <p>Frequency:</p>'+
        '  <input type="range" style="width:800px" min="0" max="40000" value="0" class="slider" id="'+id+'fre">'+
        '  <div id="'+id+'fredisp">0</div>';
        holder.appendChild(this.element);
        this.dutyelement = document.getElementById(id+'dty');
        this.freqelement = document.getElementById(id+'fre');
    }
    createframes(number){
        //this.frameData = [];
        for (var x=0; x<number; x++){
            this.frameData[x] = {
                freq: 0,
                duty: 0
            };
        }
    }
    draw(frame){
        this.currentFrame = frame;
        this.dutyelement = document.getElementById(this.id+'dty');
        this.freqelement = document.getElementById(this.id+'fre');
        this.dutyelement.value = this.frameData[frame].duty;
        this.freqelement.value = this.frameData[frame].freq;
        document.getElementById(this.id+'dtydisp').innerHTML = this.frameData[frame].duty;
        document.getElementById(this.id+'fredisp').innerHTML = this.frameData[frame].freq;
    }
    data(frame){
        if (typeof this.frameData[frame] == 'undefined'){
            return 0;
        }
        var frq = new Uint32Array(([this.frameData[frame].freq]));
        var dut = new Uint32Array(([this.frameData[frame].duty]));
        var buf = new ArrayBuffer(5);
        var bin = new Uint8Array(buf);
        bin[0] = (frq>>20);
        bin[1] = (frq>>12)&255;
        bin[2] = (frq>>4)&255;
        bin[3] = ((frq)&15)<<4;
        bin[3] = bin[3]|(dut)>>8;
        bin[4] = (dut)&255;
        var blobyhill = new Blob([bin.buffer], {type: 'application/octet-stream'});
        var dstr = "";
        bin.forEach(function(element) {
            dstr += element.toString(2) + ", ";
          });
        console.log(dstr);
        return blobyhill
      }
      edit(){
        let frame = this.currentFrame;
        this.frameData[frame].duty = parseInt(this.dutyelement.value);
        this.frameData[frame].freq = parseInt(this.freqelement.value);
        document.getElementById(this.id+'dtydisp').innerHTML = this.frameData[frame].duty;
        document.getElementById(this.id+'fredisp').innerHTML = this.frameData[frame].freq;
      }
}

class DeviceManager {
    constructor() {
        this.frames = parseInt(document.getElementById('frames').value);
        this.devices = [];
        this.currentFrame = 0;
        this.count = 0;
    }
    addDevice(){
        this.frames = parseInt(document.getElementById('frames').value);
        var type = parseInt(document.getElementById('type').value);
        var pin = parseInt(document.getElementById('pin').value);
        var width= parseInt(document.getElementById('dwidth').value);
        var height= parseInt(document.getElementById('dheight').value);
        
        var cliparea = [];
        cliparea.x= parseInt(document.getElementById('clipx').value);
        cliparea.y= parseInt(document.getElementById('clipy').value);
        cliparea.w= parseInt(document.getElementById('clipw').value);
        cliparea.h= parseInt(document.getElementById('cliph').value);
        console.log(cliparea);
        var mn = document.getElementById('mainWindow');
        var dev;
        switch(type) {
            case 1:
                dev = this.devices[this.count] = new PWM(mn, this.count++);
                dev.type = type;
                dev.pin = pin;
                dev.datalength = 5;
                dev.createframes(this.frames);
                dev.dutyelement.addEventListener("change", function() {
                    dev.edit();
                }, false);
                dev.freqelement.addEventListener("change", function() {
                    dev.edit();
                }, false);
              break;
            case 2:
                dev = this.devices[this.count] = new Neopixel(mn, this.count++);
                dev.type = type;
                dev.pin = pin;
                dev.datalength = (width*height)*3;
                dev.createframes(this.frames, width, height, cliparea);			
				dev.canvas.addEventListener("mousemove", function (e) {
					var cords = getmouse(event);
					var hex = $("#full").spectrum("get")+"";
					dev.edit(cords.x, cords.y, hex, 'move', e);
				}, false);
				dev.canvas.addEventListener("mousedown", function (e) {
					var cords = getmouse(event);
					var hex = $("#full").spectrum("get")+"";
					dev.edit(cords.x, cords.y, hex, 'down', e);
				}, false);
				dev.canvas.addEventListener("mouseup", function (e) {
					var cords = getmouse(event);
					var hex = $("#full").spectrum("get")+"";
					dev.edit(cords.x, cords.y, hex, 'up', e);
				}, false);
				dev.canvas.addEventListener("mouseout", function (e) {
					var cords = getmouse(event);
					var hex = $("#full").spectrum("get")+"";
					dev.edit(cords.x, cords.y, hex, 'out', e);
				}, false);
              break;
            default:
              break;
          }
    }
	
    draw(frame){
        this.currentFrame = frame;
        this.devices.forEach(function(element) {
            element.draw(frame);
          });
    }
    prev(){
        if(this.currentFrame>0){
            this.currentFrame--;
            this.draw(this.currentFrame);
        }else{
            this.currentFrame=this.frames-1;
            this.draw(this.currentFrame);
        }
        return this.currentFrame;
    }
    next(){
        if(this.currentFrame<this.frames-1){
            this.currentFrame++;
            this.draw(this.currentFrame);
        }else{
            this.currentFrame=0;
            this.draw(this.currentFrame);
        }
        return this.currentFrame;
    }
    datafile(){
        var datfile = [];
        var parts = 0;
        var frame = 0;
        for(var x=0; x<this.frames; x++){
            this.devices.forEach(function(element) {
                datfile[parts++]=element.data(frame);
              });
              frame++;
        }
        return new Blob(datfile, { type: 'application/octet-stream' });
    }
    sendframes(){
        frames = document.getElementById("frames").value;
        delay = document.getElementById("delay").value;
        filename = document.getElementById("filename").value;
        var cfg = 'S'+'\n'+
        filename+'\n'+
        frames+'\n'+
        0+'\n'+
        0+'\n'+
        delay+'\n'+
        (this.count)+'\n';
        this.devices.forEach(function(element) {
            cfg += element.type+'\n'+element.pin+'\n'+element.datalength+'\n';
        });

        var data = devman.datafile();
        var maxlen = 512; //512 MaxWebSocketRecvLen
        var chunks = data.size / maxlen;
        var chunkindex = 0;

        var wsUri = "ws://" + window.location.hostname;
        var socket = new WebSocket(wsUri);
        socket.binaryType = "blob";
        socket.onmessage = function (event) {
            console.log(event.data);
            if (event.data == "DONE") {
                socket.close();
            }
            if (event.data == "READY") {
                //when ready send config
                socket.send(cfg);
            }
            if (event.data == "OK") {
                //after config/binary sent, the server replies with ok.
                //Now send more
                if(chunkindex < chunks){
                    var i = chunkindex;
                    var datachunk = data.slice(i * maxlen, (i * maxlen) + maxlen, { type: 'application/octet-stream' });
                    socket.send(datachunk);
                    chunkindex++;
                }else{
                    socket.send('E');
                }
            }
            //return 1;//?
        };
        socket.onopen = function(event) {
            //Check if ready
            socket.send("R");
        };

    }
    
}


//devman.addDevice();

function addDevice(){
    genframes = generateFrames();
    devman.addDevice();
    devman.draw(0);
    framedisplay(0);
	$(".stpthr").css("display", "block");
	$("#spcontainer").css("display", "block");
	//$("#filename").val($.now);
	positionPicker();
}
function framedisplay(frm){
    document.getElementById("framedisplay").innerHTML = frm+1;
}
function prev(){
    var f=devman.prev();
    framedisplay(f);
}
function next(){
    var f=devman.next();
    framedisplay(f);
}
function sendframes(){
    devman.sendframes()
}

function setclipping(){
genframes = generateFrames();
var clippingdiv = document.createElement("div");
clippingdiv.setAttribute('id', "clippingdiv")

var gifcanvas = $('#gcanvas');
var gpos = gifcanvas.position();

clippingdiv.setAttribute('style', `
position:absolute;
top: `+(gpos.top-5)+`px;
left: `+(gpos.left-5)+`px;
width: `+(gifcanvas.width())+`px;
height: `+(gifcanvas.height())+`px;
border-color: black;
border: 5px dashed;
`);
// Get the parent node
var parentNode = document.querySelector('#gifpreview');
// Insert the new node before the reference node
parentNode.prepend(clippingdiv);

var clipdiv = $('#clippingdiv');

clipdiv.resizable({
    handles: 'n,w,s,e',
    minWidth: 1,
    maxWidth: genframes[0].width,
    maxHeight: genframes[0].height
});
clipdiv.resize(function(event) {
    var clipbox = $(event.target);
    var gifcanvas = $('#gcanvas');
    var gpos = gifcanvas.position();
    var cpos = clipbox.position();
    
    var cord = [];
    cord.x = cpos.left-gpos.left+5;
    cord.y = cpos.top-gpos.top+5;
    cord.w = clipbox.width();
    cord.h = clipbox.height();
    
    if(cord.x<0){
        cord.x = 0;
    }else if(cord.x>gifcanvas.width()){
        cord.x = gifcanvas.width();
    }
    if(cord.y<0){
        cord.y = 0;
    }else if(cord.y-10>gifcanvas.height()){
        cord.y = gifcanvas.height()-1;
    }
    if(cord.x+cord.w>gifcanvas.width()){
        cord.w = gifcanvas.width()-cord.x;
    }
    if(cord.y+clipbox.height()-10>gifcanvas.height()){
        cord.h = gifcanvas.height()-cord.y;
    }
    clipbox.offset({
        left: gpos.left+cord.x-5,
        top: gpos.top+cord.y-5
      });
    clipbox.width(cord.w);
    clipbox.height(cord.h);
    $('#clipx').val(Math.round(cord.x));
    $('#clipy').val(Math.round(cord.y));
    $('#clipw').val(Math.round(cord.w));
    $('#cliph').val(Math.round(cord.h));
    //mWid = $('#c').width()-(cpos.left-gpos.left+5);
    //mHei = $('#c').height()-(cpos.top-gpos.top+5);
    //$('#clippingdiv').resizable( "option", "maxWidth", mWid );
    //$('#clippingdiv').resizable( "option", "maxHeight", mHei );
  });
}
