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
var gif;

  function handleFileSelect(evt) {
    var files = evt.target.files; // FileList object
    // files is a FileList of File objects. List some properties.
    var output = [];
    for (var i = 0, f; f = files[i]; i++) {
		if (!f.type.match('image/gif')) {
			alert("not gif");
			continue;
		}
				  var reader = new FileReader();
				  // Closure to capture the file information.
				  reader.onload = (function(theFile) {
					return function(e) {
					var arrayBuffer = e.target.result; // Note: not oReq.responseText
					if (arrayBuffer) {
						gif = new GIF(arrayBuffer);
						var frames = gif.decompressFrames(true);                    
						// render the gif
                        loadedFrames = frames;
                        frameIndex = 0;
                    
                        c.width = frames[0].dims.width;
                        c.height = frames[0].dims.height;
                    
                        gifCanvas.width = c.width;
                        gifCanvas.height = c.height;
                    
                        if(!playing){
                            playpause();
                        }

						for(var fi=0; fi<loadedFrames.length; fi++){
                            var frame = loadedFrames[fi];
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
					}
					};
				  })(f);	
				  // Read in the image file as a data URL.
				  reader.readAsArrayBuffer(f);
    }
    document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
  }
  document.getElementById('files').addEventListener('change', handleFileSelect, false);


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

function renderFrame(){
	// get the frame
	var frame = loadedFrames[frameIndex];

	var start = new Date().getTime();

	//gifCtx.clearRect(0, 0, c.width, c.height);

	// draw the patch
	drawPatch(frame);
	var imageData = gifCtx.getImageData(0, 0, gifCanvas.width, gifCanvas.height);
	gctx.putImageData(imageData, 0, 0);
	gctx.drawImage(c, 0, 0, c.width, c.height);

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
