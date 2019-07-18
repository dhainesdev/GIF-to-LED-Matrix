# This file is executed on every boot (including wake-boot from deepsleep)

#import webrepl

#webrepl.start()

#try:
#  import usocket as socket
#except:
#  import socket

import network, machine, sdcard, os
from machine import Pin, SPI

#import esp
#esp.osdebug(None)

#import gc
#gc.collect()

def connectwifi():
  ssid = 'CHANGEME'
  password = 'CHANGEME'

  sta_if = network.WLAN(network.STA_IF); sta_if.active(True)
  sta_if.scan()                             # Scan for available access points
  sta_if.connect(ssid, password)            # Connect to an AP             

  print('Connecting to WiFi...')            # Check for successful connection

  while sta_if.isconnected() == False:
    pass
  print('Connection successful')
  print(sta_if.ifconfig())

def mountsd():
  try:
    spisd = SPI(-1, sck=Pin(14), mosi=Pin(13), miso=Pin(12))
    sd = sdcard.SDCard(spisd, machine.Pin(15)) 
    os.mount(sd, '/sd')
    return 1
  except:
    return 0
import sys

modulename = 'led_web'
if modulename not in sys.modules:
    connectwifi()
    mountsd()

import led_web