
from microWebSrv import MicroWebSrv
from neopixel import NeoPixel
from machine import Pin, PWM
import _thread
from gc import collect
from math import floor
import os
from time import sleep

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

class DIGPlayer:
    def __init__(self, pin):
        self.pin = Pin(pin, Pin.OUT)
        self.ilength = 1
    def out(self, output):
        print(output)
        try:
            self.value = output
        except:
            print("conversion failed")
    def de(self):
        return self.pin



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

ina = DIGPlayer(26)
inb = DIGPlayer(27)
sel = DIGPlayer(21)

ina.out(0)
inb.out(0)
sel.out(0)
t = PWNPlayer(22)

print("testing")
#26,27,32,33

sleep(8)
t.out(b'\x00\x0f\x00\x0f\xff')
sleep(8)
t.out(b'\x00\x0f\x00\x0f\x0f')
sleep(8)
t.out(b'\x00\x0f\x00\x0f\xff')
sleep(8)
t.out(b'\x00\x0f\x00\x0f\x0f')
sleep(8)
t.out(b'\x00\x0f\x00\x0f\xff')
sleep(8)
t.out(b'\x00\x0f\x00\x0f\x0f')
sleep(8)
t.out(b'\x00\x0f\x00\x0f\xff')
sleep(8)
t.out(b'\x00\x0f\x00\x0f\x0f')
sleep(8)
t.de().deinit()
print("done")