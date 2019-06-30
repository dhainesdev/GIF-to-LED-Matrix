// user canvas
var c = document.getElementById('c');
var gctx = c.getContext('2d');
// gif patch canvas
var tempCanvas = document.createElement('canvas');
var tempCtx = tempCanvas.getContext('2d');
// full gif canvas
var gifCanvas = document.createElement('canvas');
var gifCtx = gifCanvas.getContext('2d');

var url = document.getElementById('url');
// default gif
url.value = 'https://media2.giphy.com/media/3o6fJdwWh0N4oiMqqI/source.gif';

// load the default gif
loadGIF();
var gif;

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
	        console.log(gif);
	        // render the gif
			renderGIF(frames);
			//load the frames into my code for edditing frames
			document.getElementById("frames").value = loadedFrames.length;
			updateSettings();
			for(var fi=0; fi<loadedFrames.length; fi++){
				sepFrames(loadedFrames[fi], fi);
			}
	    }
	};
	oReq.send(null);	
}
//load the frames into my code for edditing frames
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
	var ictx = frameData[framenumber].getContext("2d");
	ictx.drawImage(tempCanvas, dims.left, dims.top, dims.width, dims.height, 0, 0, width, height);
	currentFrame = framenumber;
	draw();
	framedisplay(currentFrame);
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

	gifCanvas.width = c.width;
	gifCanvas.height = c.height;

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
}

var edge = function(data, output){

	var odata = output.data;
	var width = gif.raw.lsd.width;
	var height = gif.raw.lsd.height;

	var conv = [-1, -1, -1, 
				-1, 8, -1,
				-1, -1, -1];
	var halfside = Math.floor(3/2);

	for(var y=0; y<height; y++){
		for(var x=0; x<width; x++){

			var r=0, g=0, b=0;
			for(var cy=0; cy<3; cy++){
				for(var cx=0; cx<3; cx++){

					var scy = (y - halfside + cy);
					var scx = (x - halfside + cx);

					if(scy >= 0 && scy < height && scx >= 0 && scx < width){
						var src = (scy * width + scx) * 4;
						var f= cy * 3 + cx;
						r += data[src] * conv[f];
						g += data[src + 1] * conv[f];
						b += data[src + 2] * conv[f];
					}
				}
			}

			var i = (y * width + x) * 4;
			odata[i]     = r;
			odata[i + 1] = g;
			odata[i + 2] = b;
			odata[i + 3] = 255;
		}
	}

	return output;
}

var invert = function(data) {
	for (var i = 0; i < data.length; i += 4) {
		data[i]     = 255 - data[i];     // red
		data[i + 1] = 255 - data[i + 1]; // green
		data[i + 2] = 255 - data[i + 2]; // blue
		data[i + 3] = 255;
	}
};

var grayscale = function(data) {
	for (var i = 0; i < data.length; i += 4) {
		var avg = (data[i] + data[i +1] + data[i +2]) / 3;
		data[i]     = avg; // red
		data[i + 1] = avg; // green
		data[i + 2] = avg; // blue
		data[i + 3] = 255;
	}
};

function manipulate(){
	var imageData = gifCtx.getImageData(0, 0, gifCanvas.width, gifCanvas.height);
	var other = gifCtx.createImageData(gifCanvas.width, gifCanvas.height);

	if(bEdgeDetect){
		imageData = edge(imageData.data, other);
	}

	if(bInvert){
		invert(imageData.data);	
	}

	if(bGrayscale){
		grayscale(imageData.data);
	}

	// do pixelation
	var pixelsX = 5 + Math.floor(pixelPercent / 100 * (c.width - 5));
	var pixelsY = (pixelsX * c.height) / c.width;

	if(pixelPercent != 100){
		gctx.mozImageSmoothingEnabled = false;
		gctx.webkitImageSmoothingEnabled = false;
		gctx.imageSmoothingEnabled = false;
	}

	gctx.putImageData(imageData, 0, 0);
	gctx.drawImage(c, 0, 0, c.width, c.height, 0, 0, pixelsX, pixelsY);
	gctx.drawImage(c, 0, 0, pixelsX, pixelsY, 0, 0, c.width, c.height);
}

function renderFrame(){
	// get the frame
	var frame = loadedFrames[frameIndex];

	var start = new Date().getTime();

	gifCtx.clearRect(0, 0, c.width, c.height);

	// draw the patch
	drawPatch(frame);

	// perform manipulation
	manipulate();

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
