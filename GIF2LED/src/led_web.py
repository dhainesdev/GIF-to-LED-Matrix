from MicroWebSrv import MicroWebSrv
from neopixel import NeoPixel
from machine import Pin, PWM
import _thread
from gc import collect
from math import floor
import os

#motor = PWM(Pin(26), freq=50)

n_neopixels = 1225
np = NeoPixel(Pin(2), n_neopixels)
play=0
playfile = "autoplay"
framelength=0
def _httpHandlerLEDPost(httpClient, httpResponse):
    global play
    global playfile
    global framelength
    if play == 1: #animation loop running
        play = 0 #signal stop
        while play != 3: #wait for animation loop to exit
            pass
        else:
          collect()
    content = httpClient.ReadRequestContent()
    print(content)
    beg = 'S'.encode('utf-8')[0]
    eof = 'E'.encode('utf-8')[0]
    if content[0] == eof :      #end of file
        play=1
        _thread.start_new_thread(animation, ())
    elif content[0] == beg :    #begining of file
        content = content.decode('utf-8')
        content = content.splitlines()
        filename = content[1]
        width = content[3]
        height = content[4]
        framelength = width*height
        try:
            os.mkdir("/sd/"+filename)
        except FileExistsError:
            pass
        cfg = open("/sd/"+filename+"/cfg.dat",'w')
        #write data to file excluding filename
        cfglen = len(content)-1
        for i in range(cfglen):
          cfg.write(content[i+1] + "\n")
        cfg.close()
        #set to play and continue to append
        playfile = filename
    else :                      #animation frame
        new_sequence = open("/sd/"+playfile+"/dat.dat",'a')
        new_sequence.write(content)
        new_sequence.close()
    httpResponse.WriteResponseJSONOk()

#frames = content[1]
#width =
#height =
#device =
#fps = 


def read_in_chunks(file_object, chunk_size):
    while True:
        data = file_object.read(chunk_size)
        if not data:
            break
        yield data

def animation():
  collect()
  global np
  global n_neopixels
  global play
  global playfile
  global framelength
  try:
    play_config = open("/sd/"+playfile+"/cfg.dat",'r')
    play_config.close()
  except:
    play = 3
    print("/sd/"+playfile+"/cfg.dat"+" failed to open")
    _thread.exit()
  try:
    f = open("/sd/"+playfile+"/dat.dat",'r')
    f.close()
  except:
    play = 3
    print("/sd/"+playfile+"/dat.dat"+" failed to open")
    _thread.exit()
  collect()
  while play:
    i = 0
    with open("/sd/"+playfile+"/dat.dat", "rb") as f:
      pixel = [ord(b) for b in f.read(3)]
      red = pixel[0]
      green = pixel[1]
      blue = pixel[2]
      if i >= framelength:
        i=0
        np.write()
      else:
        i+=1
      np[i] = (red, green, blue)

  play = 3
  _thread.exit()



      # for frame in infile:
      #     pixels = frame.split(",")
      #     pixelcount = len(pixels)-1 #subtract one so as to not go over newline character
      #     for i in range(pixelcount):
      #       pixel = int(pixels[i])
      #       red   = (pixel>>16)&255
      #       green = (pixel>>8)&255
      #       blue  = (pixel)&255
      #       np[i] = (red, green, blue)
      #     np.write()

#dutycycle = floor((red+green+blue)*.25)
#motor.duty(dutycycle)

#begin animation at start
play=1
_thread.start_new_thread(animation, ())

routeHandlers = [ ( "/led", "POST",  _httpHandlerLEDPost ) ]
srv = MicroWebSrv(routeHandlers=routeHandlers, webPath='www/')
srv.Start(threaded=False)