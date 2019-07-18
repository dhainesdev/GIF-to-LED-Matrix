
from microWebSrv import MicroWebSrv

# ----------------------------------------------------------------------------

def _acceptWebSocketCallback(webSocket, httpClient) :
	print("WS ACCEPT")
	webSocket.RecvTextCallback   = _recvTextCallback
	webSocket.RecvBinaryCallback = _recvBinaryCallback
	webSocket.ClosedCallback 	 = _closedCallback

def _recvTextCallback(webSocket, msg) :
	print("WS RECV TEXT : %s" % msg)
	webSocket.SendText("OK")

def _recvBinaryCallback(webSocket, data) :
	print("WS RECV DATA : %s" % data)
	webSocket.SendText("OK")

def _closedCallback(webSocket) :
	print("WS CLOSED")

# ----------------------------------------------------------------------------

srv = MicroWebSrv(webPath='www/')
srv.MaxWebSocketRecvLen     = 256
srv.WebSocketThreaded		= False
srv.AcceptWebSocketCallback = _acceptWebSocketCallback
srv.Start()

# ----------------------------------------------------------------------------
