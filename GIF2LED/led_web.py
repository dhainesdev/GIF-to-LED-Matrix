from microWebSrv import MicroWebSrv
from neopixel import NeoPixel
from machine import Pin, PWM
import _thread
from gc import collect
from math import floor
import os
from time import sleep

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


play=0
playfile = "autoplay"
framelength=0
delay = 0

pwmdevs = []
class PWNPlayer:
    global pwmdevs
    count = 0
    def __init__(self, pin):
        self.pin = pin
        self.count
        pwmdevs.append(PWM(Pin(self.pin)))
        self.id = self.count
        print(pwmdevs[self.count])
        self.count+=1
        print("class")
        self.ilength = 5
    def out(self, output):
        print(output)
        try:
            #first 12 bits
            sduty = int.from_bytes(output[3:5], 'big', False)&1023
            #last 28 bits
            sfreq = int.from_bytes(output[:4], 'big', False)>>4
            print("f: "+str(sfreq))
            print("d: "+str(sduty))
            pwmdevs[self.id].freq(sfreq)
            pwmdevs[self.id].duty(sduty)
        except:
            print("conversion failed")
    def de(self):
        return pwmdevs[self.id]


# pwm = []
# pwm.append(PWNPlayer(26))
# #pwm[0].out(b'\x00\xF0\x00\x0F\xFF')
# sleep(8)
# pwm[0].out(b'\x00\x00\x00\x00\x00')
# # sleep(8)
# print(pwm[0])
# pwm[0].de().deinit()


#PWNPlayer(27)
#PWNPlayer(8)
#PWNPlayer(9)

print("testing")
#26,27,32,33
t = PWNPlayer(26)
tt = PWNPlayer(27)
sleep(8)
# t.out(b'\x00\x0f\x00\x0f\xff')
# sleep(8)
# t.out(b'\x00\x00\x00\x00\x00')
# sleep(8)
# tt.out(b'\x00\x0f\x00\x0f\xff')
# sleep(8)
# tt.out(b'\x00\x00\x00\x00\x00')
t.de().deinit()
tt.de().deinit()
print("done")

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
        1: PWNPlayer(a1),
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
            print("player")
            print(handler)
            print("Device added, Type: "+ str(devicetype) + " Pin: " + str(pin)+ " Datalength: " + str(datalength))
    
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
    print("/sd/"+playfile+"/"+" failed to open playback file(s)")
    _thread.exit()
  print("Playing")
  try:
    fileplay = Player(playfile)
    while play:
        fileplay.render()
    fileplay.close()
  except:
      print("Playback failed")
  print("Playing ended")
  play = 3

# ----------------------------------------------------------------------------

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
        print("new")
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

# ----------------------------------------------------------------------------

srv = MicroWebSrv(webPath='www/')
srv.MaxWebSocketRecvLen     = 512
srv.WebSocketThreaded		= True
srv.AcceptWebSocketCallback = _acceptWebSocketCallback
srv.Start()

# ----------------------------------------------------------------------------