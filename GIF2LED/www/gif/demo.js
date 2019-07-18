var c, gctx, tempCanvas, tempCtx, gifCanvas, gifCtx, url, gif;
function ginit(){
	// user canvas
	c = document.getElementById('gcanvas');
	gctx = c.getContext('2d');
	// gif patch canvas
	tempCanvas = document.createElement('canvas');
	tempCtx = tempCanvas.getContext('2d');
	// full gif canvas
	gifCanvas = document.createElement('canvas');
	gifCtx = gifCanvas.getContext('2d');
	
	url = document.getElementById('url');

	document.getElementById('files').addEventListener('change', handleFileSelect, false);
}
window.addEventListener("load", ginit, false);

  function handleFileSelect(evt) {
    var files = evt.target.files; // FileList object
    // files is a FileList of File objects. List some properties.
    var output = [];
    for (var i = 0, f; f = files[i]; i++) {
		if (!f.type.match('image/gif')) {
			alert("Only files with the .gif extesnion are supported.");
			continue;
		}
      //output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') ',
			//	  '</li>');
				  var reader = new FileReader();
				  // Closure to capture the file information.
				  reader.onload = (function(theFile) {
					return function(e) {
					var arrayBuffer = e.target.result; // Note: not oReq.responseText
					if (arrayBuffer) {
						gif = new GIF(arrayBuffer);
						var frames = gif.decompressFrames(true);
						// render the gif
						renderGIF(frames);
						for(var fi=0; fi<loadedFrames.length; fi++){
							sepFrames(loadedFrames[fi], fi);
						}
					}
					};
				  })(f);	
				  // Read in the image file as a data URL.
				  reader.readAsArrayBuffer(f);
    }
    //document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
  }
  
// load a gif with the current input url value
function loadGIF(){
	var oReq = new XMLHttpRequest();
	oReq.open("GET", url.value, true);
	oReq.responseType = "arraybuffer";

	oReq.onload = function (oEvent) {
	    var arrayBuffer = oReq.response; // Note: not oReq.responseText
	    if (arrayBuffer) {
	        gif = new GIF(arrayBuffer);
	        var frames = gif.decompressFrames(true);
	        //console.log(gif);
	        // render the gif
			renderGIF(frames);
			for(var fi=0; fi<loadedFrames.length; fi++){
				sepFrames(loadedFrames[fi], fi);
			}
	    }
	};
	oReq.send(null);	
}

function sepFrames(frame, framenumber){
	var dims = frame.dims;
	
	if(!frameImageData || dims.width != frameImageData.width || dims.height != frameImageData.height){
		tempCanvas.width = dims.width;
		tempCanvas.height = dims.height;
		frameImageData = tempCtx.createImageData(dims.width, dims.height);	
	}
	
	// set the patch data as an override
	frameImageData.data.set(frame.patch);
	// draw the patch back over the canvas
	tempCtx.putImageData(frameImageData, 0, 0);
}

var playing = false;
var bEdgeDetect = false;
var bInvert = false;
var bGrayscale = false;
var pixelPercent = 100;
var loadedFrames;
var frameIndex;

function playpause(){
	playing = !playing;
	if(playing){
		renderFrame();
	}
}

function renderGIF(frames){
	loadedFrames = frames;
	frameIndex = 0;

	c.width = frames[0].dims.width;
	c.height = frames[0].dims.height;
	$(c).parent().css("height", c.height);
	$(c).parent().css("width", c.width);
	$("#stponeui").css("display", "none");
	$(".stptwo").css("display", "block");
	gifCanvas.width = c.width;
	gifCanvas.height = c.height;

	document.getElementById("frames").value = loadedFrames.length;
	document.getElementById('clipw').value = c.width;
	document.getElementById('cliph').value = c.height;

	if(!playing){
		playpause();
	}
}

var frameImageData;

function drawPatch(frame){
	var dims = frame.dims;
	if(!frameImageData || dims.width != frameImageData.width || dims.height != frameImageData.height){
		tempCanvas.width = dims.width;
		tempCanvas.height = dims.height;
		frameImageData = tempCtx.createImageData(dims.width, dims.height);	
	}
	// set the patch data as an override
	frameImageData.data.set(frame.patch);
	// draw the patch back over the canvas
	tempCtx.putImageData(frameImageData, 0, 0);
	gifCtx.drawImage(tempCanvas, dims.left, dims.top);
	// draw to canvas
	var imageData = gifCtx.getImageData(0, 0, gifCanvas.width, gifCanvas.height);
	gctx.putImageData(imageData, 0, 0);
	gctx.drawImage(c, 0, 0, c.width, c.height);
}

function renderFrame(){
	// get the frame
	var frame = loadedFrames[frameIndex];

	var start = new Date().getTime();

	//gifCtx.clearRect(0, 0, c.width, c.height);

	// draw the patch
	drawPatch(frame);
	// update the frame index
	frameIndex++;
	if(frameIndex >= loadedFrames.length){
		frameIndex = 0;
	}
	var end = new Date().getTime();
	var diff = end - start;

	if(playing){
		// delay the next gif frame
		setTimeout(function(){
			requestAnimationFrame(renderFrame);
			//renderFrame();
		}, Math.max(0, Math.floor(frame.delay - diff)));
	}
}
function generateFrames(){
	var genFrames = []
	var ind = 0;
	loadedFrames.forEach(function(frame) {
		var dims = frame.dims;
		if(!frameImageData || dims.width != frameImageData.width || dims.height != frameImageData.height){
			tempCanvas.width = dims.width;
			tempCanvas.height = dims.height;
			frameImageData = tempCtx.createImageData(dims.width, dims.height);	
		}
		// set the patch data as an override
		frameImageData.data.set(frame.patch);
		// draw the patch back over the canvas
		tempCtx.putImageData(frameImageData, 0, 0);
		gifCtx.drawImage(tempCanvas, dims.left, dims.top);
		// draw to canvas
		var imageData = gifCtx.getImageData(0, 0, gifCanvas.width, gifCanvas.height);
		genFrames[ind] = document.createElement('canvas');
		genFrames[ind].width = gifCanvas.width;
		genFrames[ind].height = gifCanvas.height;
		var ictx = genFrames[ind].getContext("2d");
		ictx.putImageData(imageData, 0, 0);
		//ictx.drawImage(c, 0, 0, gifCanvas.width, gifCanvas.height);
		ind++;
	});
	return genFrames;
}