from microWebSrv import MicroWebSrv
from neopixel import NeoPixel
from machine import Pin, PWM
import _thread
from gc import collect
from math import floor
import os
from time import sleep

play=0
playfile = "autoplay"
framelength = 0
delay = 0

def sdsettup():
    from boot import mountsd
    mountsd()
    sdcheck()
def sdcheck():
    try:
        test = open("/sd/sdexists",'w')
        test.close()
        print("SD Mounted")
    except:
        print("SD not mounted. Mounting SD...")
        sdsettup()
sdcheck()
collect()

class NeoPixelPlayer:
    def __init__(self, pin, nlength):
        self.nlength = nlength
        self.np = NeoPixel(Pin(pin), nlength)
        #input length
        self.ilength = nlength
    def out(self, output):
        self.np.buf = output
        self.np.write()

def classpick(argument, a1, a2):
    picker = {
        2: NeoPixelPlayer(a1, a2)
    }
    return picker.get(argument)

class Player:
    def __init__(self, dfile):
        self.dfile = open("/sd/"+dfile+"/dat.dat", "rb")
        cfile = open("/sd/"+dfile+"/cfg.dat", "r")
        lines = cfile.read()
        cfile.close()
        lines = lines.splitlines()
        self.framecount = int(lines[0])
        self.width = int(lines[1])
        self.height = int(lines[2])
        self.delay = int(lines[3])
        self.framelength = self.width*self.height
        self.devicecount = int(lines[4])
        self.devices = []
        for x in range(0, self.devicecount*3, 3):
            i = 5+x
            devicetype = int(lines[i])
            pin = int(lines[i+1])
            datalength  = int(lines[i+2])
            handler = classpick(devicetype, pin, datalength)
            self.devices.append(handler)
            print("Playback Started")
            #print(handler)
            print("Device Configured, Type: "+ str(devicetype) + " Pin: " + str(pin)+ " Datalength: " + str(datalength))
    
    def render(self):
        for x in range(self.devicecount):
            device = self.devices[x]
            datalen = device.ilength
            dataout = self.dfile.read(datalen)
            if dataout == b'':
                self.dfile.seek(0)
                dataout = self.dfile.read(datalen)
            device.out(dataout)
        sleep(self.delay/100)

    def close(self):
        self.dfile.close

def animation():
  global play
  global playfile
  global framelength
  global delay
  play = 1
  try:
    cfg = open("/sd/"+playfile+"/cfg.dat",'r')
    cfg.close()
    dat = open("/sd/"+playfile+"/dat.dat",'r')
    dat.close()
  except:
    play = 3
    print("Failed to open playback file "+"/sd/"+playfile)
  print("Starting Playback")
  try:
    fileplay = Player(playfile)
    while play:
        fileplay.render()
    fileplay.close()
  except:
      print("Playback failed")
  print("Stopped Playback")
  play = 3

def _acceptWebSocketCallback(webSocket, httpClient) :
    print("WS Connected")
    webSocket.RecvTextCallback   = _recvTextCallback
    webSocket.RecvBinaryCallback = _recvBinaryCallback
    webSocket.ClosedCallback 	 = _closedCallback


def _recvTextCallback(webSocket, content) :
    global play
    global playfile
    global framelength
    global delay
    beg = 'S'
    eof = 'E'
    rdy = 'R'
    if content[0] == rdy :
        if play == 1: #animation loop running
            play = 0 #signal stop
            while play != 3: #wait for animation loop to exit
                pass
        #collect()
        print("Animation Stopped, ready.")
        webSocket.SendText("READY")
    elif content[0] == eof :      #end of file
        print("File done")
        webSocket.SendText("DONE")
    elif content[0] == beg :    #begining of file
        try:
            #lines = content.decode('utf-8')
            lines = content
            lines = lines.splitlines()
            filename = lines[1]
        except:
            print("failed to parse info")
        try:
            os.remove("/sd/"+filename+"/cfg.dat")
            os.remove("/sd/"+filename+"/dat.dat")
            os.rmdir("/sd/"+filename)
            print("File with that name found, removing: "+filename)
        except:
            print("Creating new file: "+filename)
            pass
        try:
            os.mkdir("/sd/"+filename)
        except:
            print("Failed to create folder")
            pass

        print("Creating config")
        cfg = open("/sd/"+filename+"/cfg.dat",'w')
        #write data to file excluding 'S' and filename
        cfglen = len(lines)
        for i in range(2, cfglen):
          cfg.write(lines[i] + "\n")
        cfg.close()
        print("Now loading data, please stand by.")
        #set to play and continue to append
        playfile = filename
        webSocket.SendText("OK")

def _recvBinaryCallback(webSocket, data) :
    print(data)
    try:
        new_sequence = open("/sd/"+playfile+"/dat.dat",'a')
        new_sequence.write(data)
        new_sequence.close()
        webSocket.SendText("OK")
    except:
        webSocket.SendText("FAIL")

def _closedCallback(webSocket) :
    print("WS Closed, now play")
    animation()

# ------------------[Start Server]--------------------------------------------
print("Start Server")
srv = MicroWebSrv(webPath='www/')
srv.MaxWebSocketRecvLen     = 512
#srv.WebSocketThreaded		= True
srv.AcceptWebSocketCallback = _acceptWebSocketCallback
srv.Start(threaded=True)

# ----------------------------------------------------------------------------

# ------------------[Auto Play]-----------------------------------------------
print("Auto Play")
animation()
# ----------------------------------------------------------------------------