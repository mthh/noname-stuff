# -*- coding: utf-8 -*-
"""
@author: mz
"""
import asyncio
import zmq
import zmq.asyncio
import aiozmq
import uvloop
import sys


class Protocol(aiozmq.ZmqProtocol):
    def __init__(self, loop):
        self.transport = None
        self.connected = asyncio.Future(loop=loop)
        self.closed = asyncio.Future(loop=loop)
        self.state = 'INITIAL'
        self.received = asyncio.Queue(loop=loop)
        self.paused = False

    def connection_made(self, transport):
        self.transport = transport
        assert self.state == 'INITIAL', self.state
        self.state = 'CONNECTED'
        self.connected.set_result(None)

    def connection_lost(self, exc):
        assert self.state == 'CONNECTED', self.state
        self.state = 'CLOSED'
        self.transport = None
        self.closed.set_result(None)

    def pause_writing(self):
        self.paused = True

    def resume_writing(self):
        self.paused = False

    def msg_received(self, data):
#        assert isinstance(data, list), data
        assert self.state == 'CONNECTED', self.state
        self.received.put_nowait(data)


def main(client_url):
    asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
    loop = asyncio.get_event_loop()
    asyncio.set_event_loop(loop)
    async def run(loop):
        res = await client_async(b"foobar_request", b'"barbaz_data"', loop, 1, client_url)
        print("Result in client: ", res.decode())
        res = await client_async(b"make_cartogram", b"[1,2,3]", loop, 1, client_url)
        print("Result in client: ", res.decode())

    try:
        loop.run_until_complete(run(loop))
    except KeyboardInterrupt:
        return


async def client_async(request, data, loop, i, client_url):
    transp, protocol = await aiozmq.create_zmq_connection(
        lambda: Protocol(loop),
        zmq.REQ,
        loop=loop)
    await protocol.connected
    transp.setsockopt(zmq.IDENTITY, '{}'.format(i).encode())
    await transp.connect(client_url)

    transp.write([request, b'', data])
    res = await protocol.received.get()
    transp.close()
    asyncio.ensure_future(protocol.closed)
    return res[0]


if __name__ == "__main__":
    if len(sys.argv) < 2 or "ipc" in sys.argv[1]:
        CLIENT_URL = 'ipc:///tmp/feeds/clients'
    else:
        CLIENT_URL = "tcp://localhost:5559"
    main(CLIENT_URL)

